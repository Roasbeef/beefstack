#!/usr/bin/env python3
"""Bookkeeping for a hillclimb loop: state, judge integrity, scoring, ratchet.

The agent edits code; a judge program scores it. This script holds the parts
that must not depend on the agent's judgment: which cases are held out, whether
the judge changed, how a round's score is computed from per-case rows, and
whether a round clears the noise floor.

Layout, under <root>/<flow>/ (root defaults to .hillclimb in the repo):

  state.json          goal, judge command and paths, noise, rounds, best
  narrative.md        rewritten by the agent after every round
  scores.tsv          per-case score, one column per round (written by status)
  rounds/<rid>/       results.jsonl, judge.log, change.md, change.patch

A results.jsonl row is one case:

  {"case": "TestFoo/bar", "pass": true}            count metric
  {"case": "BenchmarkFindPath", "value": 812000.0} value metric
  {"case": "...", "error": "timeout"}              harness error, not scored

Subcommands: init, approve, check, run, compare, record, noise, status,
from-gotest, from-bench. Run with -h for each.
"""

import argparse
import hashlib
import json
import math
import os
import re
import statistics
import subprocess
import sys

EXIT_JUDGE_CHANGED = 2


# ------------------------------------------------------------------ state


def flow_dir(args):
    return os.path.join(args.root, args.flow)


def load_state(fdir):
    with open(os.path.join(fdir, "state.json")) as f:
        return json.load(f)


def save_state(fdir, state):
    path = os.path.join(fdir, "state.json")
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(state, f, indent=2, sort_keys=True)
        f.write("\n")
    os.replace(tmp, path)


def judge_sha(paths):
    """Hashes every judge file in a fixed order. A missing file hashes as
    missing, so deleting a judge file is a change too."""
    h = hashlib.sha256()
    for p in sorted(paths):
        h.update(p.encode() + b"\0")
        if os.path.isdir(p):
            for dirpath, dirnames, files in os.walk(p):
                dirnames.sort()
                for name in sorted(files):
                    fp = os.path.join(dirpath, name)
                    h.update(fp.encode() + b"\0")
                    with open(fp, "rb") as f:
                        h.update(f.read())
        elif os.path.exists(p):
            with open(p, "rb") as f:
                h.update(f.read())
        else:
            h.update(b"<missing>")
    return h.hexdigest()


def is_held(flow, case, held_pct):
    """Assigns a case to the held-out split by hash, so the split is fixed
    without a stored list and a new case lands in the same split every run."""
    d = hashlib.sha256((flow + "\0" + case).encode()).digest()
    return int.from_bytes(d[:4], "big") % 100 < held_pct


def read_rows(path):
    rows = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            rows[row["case"]] = row
    return rows


def round_rows(fdir, rid):
    return read_rows(os.path.join(fdir, "rounds", rid, "results.jsonl"))


# ---------------------------------------------------------------- scoring


def case_score(row, base_row, kind):
    """Returns a case's score, or None when the case is a harness error.

    A count case scores 1 or 0. A value case scores its ratio to the
    baseline value, so every case weighs the same in the geometric mean.
    """
    if row is not None and "error" in row:
        return None
    if kind == "count":
        return 1.0 if row is not None and row.get("pass") else 0.0
    if base_row is None or "value" not in base_row:
        return None
    if row is None or "value" not in row:
        # A benchmark that vanished cannot have improved.
        return math.inf
    return row["value"] / base_row["value"]


def split_scores(state, rows, base_rows):
    """Scores a round on each split over the baseline's case set.

    Cases are taken from the baseline, so a case that disappears (a deleted
    test, a renamed benchmark) scores as a failure instead of shrinking the
    denominator. Cases new since the baseline are ignored for the same
    reason: the comparison is over a fixed set.
    """
    kind = state["goal"]["kind"]
    out = {}
    for split in ("train", "held"):
        vals = []
        for case in sorted(base_rows):
            if is_held(state["flow"], case, state["held_pct"]) != (split == "held"):
                continue
            s = case_score(rows.get(case), base_rows[case], kind)
            if s is not None:
                vals.append(s)
        if not vals:
            out[split] = None
        elif kind == "count":
            out[split] = sum(vals) / len(vals)
        elif any(math.isinf(v) for v in vals):
            out[split] = math.inf
        else:
            out[split] = math.exp(sum(math.log(v) for v in vals) / len(vals))
        out[split + "_n"] = len(vals)
    return out


def better(state, a, b):
    """Reports whether score a beats score b by more than the noise floor."""
    if a is None or b is None:
        return False
    noise = state.get("noise", 0.0)
    if state["goal"]["kind"] == "count":
        return a - b > noise
    # Value scores are ratios to baseline; lower is better.
    if math.isinf(a):
        return False
    if math.isinf(b):
        return True
    return math.log(b) - math.log(a) > noise


def worse(state, a, b):
    """Reports whether a regresses from b by more than the noise floor."""
    if a is None or b is None:
        return False
    return better(state, b, a)


def best_kept(state):
    kept = [r for r in state["rounds"] if r["kept"]]
    return kept[-1] if kept else None


# ------------------------------------------------------------- commands


def cmd_init(args):
    fdir = flow_dir(args)
    if os.path.exists(os.path.join(fdir, "state.json")):
        sys.exit("hc: %s already exists" % fdir)
    os.makedirs(os.path.join(fdir, "rounds"), exist_ok=True)
    state = {
        "flow": args.flow,
        "goal": {"kind": args.kind, "metric": args.metric},
        "judge_cmd": args.judge,
        "judge_paths": args.judge_path,
        "judge_sha": None,
        "guard_cmds": args.guard,
        "held_pct": args.held_pct,
        "noise": 0.0,
        "rounds": [],
    }
    save_state(fdir, state)
    print(fdir)


def cmd_approve(args):
    fdir = flow_dir(args)
    state = load_state(fdir)
    state["judge_sha"] = judge_sha(state["judge_paths"])
    save_state(fdir, state)
    print("approved judge %s" % state["judge_sha"][:12])


def check_judge(state):
    if state["judge_sha"] is None:
        return "judge not approved yet: run `hc.py approve` after reading it"
    if judge_sha(state["judge_paths"]) != state["judge_sha"]:
        return "judge files changed since approval: show the diff to the user"
    return None


def cmd_check(args):
    err = check_judge(load_state(flow_dir(args)))
    if err:
        print("hc: " + err, file=sys.stderr)
        sys.exit(EXIT_JUDGE_CHANGED)
    print("judge unchanged")


def cmd_run(args):
    fdir = flow_dir(args)
    state = load_state(fdir)
    err = check_judge(state)
    if err:
        print("hc: " + err, file=sys.stderr)
        sys.exit(EXIT_JUDGE_CHANGED)
    rdir = os.path.join(fdir, "rounds", args.rid)
    os.makedirs(rdir, exist_ok=True)
    for cmd in state["guard_cmds"]:
        with open(os.path.join(rdir, "guard.log"), "a") as log:
            log.write("$ %s\n" % cmd)
            log.flush()
            rc = subprocess.call(cmd, shell=True, stdout=log, stderr=log)
        if rc != 0:
            print("hc: guard failed (exit %d): %s" % (rc, cmd), file=sys.stderr)
            sys.exit(1)
    out = os.path.join(rdir, "results.jsonl")
    with open(out, "w") as res, open(os.path.join(rdir, "judge.log"), "w") as log:
        rc = subprocess.call(state["judge_cmd"], shell=True, stdout=res, stderr=log)
    n = len(read_rows(out))
    print("%s: %d cases, judge exit %d" % (args.rid, n, rc))
    if n == 0:
        sys.exit("hc: judge produced no rows; see %s/judge.log" % rdir)


def compare(state, fdir, rid):
    base = round_rows(fdir, "baseline")
    cur = split_scores(state, round_rows(fdir, rid), base)
    ref_round = best_kept(state)
    ref_id = ref_round["rid"] if ref_round else "baseline"
    ref = split_scores(state, round_rows(fdir, ref_id), base)
    if worse(state, cur["held"], ref["held"]):
        verdict = "REVERT: held-out regressed"
    elif better(state, cur["train"], ref["train"]):
        verdict = "KEEP"
    elif better(state, cur["held"], ref["held"]):
        verdict = "NOISE: held-out up, train flat; rerun before keeping"
    else:
        verdict = "REVERT: no gain above noise"
    return ref_id, ref, cur, verdict


def fmt(state, v):
    if v is None:
        return "-"
    if math.isinf(v):
        return "lost"
    if state["goal"]["kind"] == "count":
        return "%.3f" % v
    return "%.3fx" % v


def cmd_compare(args):
    fdir = flow_dir(args)
    state = load_state(fdir)
    ref_id, ref, cur, verdict = compare(state, fdir, args.rid)
    print("vs %s  train %s -> %s  held %s -> %s  (noise %.4f)" % (
        ref_id, fmt(state, ref["train"]), fmt(state, cur["train"]),
        fmt(state, ref["held"]), fmt(state, cur["held"]), state["noise"]))
    print(verdict)


def cmd_record(args):
    fdir = flow_dir(args)
    state = load_state(fdir)
    if any(r["rid"] == args.rid for r in state["rounds"]):
        sys.exit("hc: round %s already recorded" % args.rid)
    base = round_rows(fdir, "baseline")
    sc = split_scores(state, round_rows(fdir, args.rid), base)
    state["rounds"].append({
        "rid": args.rid, "change": args.change, "kept": args.kept,
        "commit": args.commit, "train": sc["train"], "held": sc["held"],
    })
    save_state(fdir, state)
    print("recorded %s (%s)" % (args.rid, "kept" if args.kept else "reverted"))


def cmd_noise(args):
    """Sets the noise floor from two runs of unchanged code."""
    fdir = flow_dir(args)
    state = load_state(fdir)
    a, b = round_rows(fdir, args.a), round_rows(fdir, args.b)
    kind = state["goal"]["kind"]
    if kind == "count":
        cases = [c for c in a if c in b and "error" not in a[c] and "error" not in b[c]]
        flips = sum(1 for c in cases if bool(a[c].get("pass")) != bool(b[c].get("pass")))
        # Each flipped case moves the score by 1/n, so the flip fraction is
        # how far unchanged code moves it.
        noise = flips / len(cases) if cases else 0.0
    else:
        logs = [abs(math.log(b[c]["value"] / a[c]["value"])) for c in a
                if c in b and "value" in a[c] and "value" in b[c]]
        noise = statistics.median(logs) if logs else 0.0
    state["noise"] = max(noise, args.min)
    save_state(fdir, state)
    print("noise floor %.4f" % state["noise"])


def cmd_status(args):
    fdir = flow_dir(args)
    state = load_state(fdir)
    base = round_rows(fdir, "baseline")
    bs = split_scores(state, base, base)
    lines = ["| round | change | kept | train | held | commit |",
             "|---|---|---|---|---|---|",
             "| baseline | - | - | %s | %s | - |" % (fmt(state, bs["train"]), fmt(state, bs["held"]))]
    for r in state["rounds"]:
        lines.append("| %s | %s | %s | %s | %s | %s |" % (
            r["rid"], r["change"], "yes" if r["kept"] else "no",
            fmt(state, r["train"]), fmt(state, r["held"]), r.get("commit") or "-"))
    b = best_kept(state)
    lines.append("")
    lines.append("Best kept: %s. Noise floor %.4f. Train n=%d, held n=%d." % (
        b["rid"] if b else "baseline", state["noise"], bs["train_n"], bs["held_n"]))
    print("\n".join(lines))

    rids = ["baseline"] + [r["rid"] for r in state["rounds"]]
    per = {rid: round_rows(fdir, rid) for rid in rids}
    with open(os.path.join(fdir, "scores.tsv"), "w") as f:
        f.write("case\tsplit\t" + "\t".join(rids) + "\n")
        for case in sorted(base):
            split = "held" if is_held(state["flow"], case, state["held_pct"]) else "train"
            cells = []
            for rid in rids:
                s = case_score(per[rid].get(case), base[case], state["goal"]["kind"])
                cells.append("err" if s is None else ("lost" if math.isinf(s) else "%.4g" % s))
            f.write("%s\t%s\t%s\n" % (case, split, "\t".join(cells)))


# -------------------------------------------------------------- adapters


def from_gotest(stream, out):
    """Converts `go test -json` to rows: one per test, plus one failing row
    per package that failed without reporting any test (a build failure)."""
    tested, failed_pkgs = set(), set()
    for line in stream:
        try:
            ev = json.loads(line)
        except ValueError:
            continue
        action, pkg, test = ev.get("Action"), ev.get("Package", ""), ev.get("Test")
        if test and action in ("pass", "fail", "skip"):
            tested.add(pkg)
            row = {"case": pkg + "." + test, "pass": action == "pass"}
            if action == "skip":
                row = {"case": pkg + "." + test, "error": "skipped"}
            out.write(json.dumps(row) + "\n")
        elif not test and action == "fail":
            failed_pkgs.add(pkg)
    for pkg in sorted(failed_pkgs - tested):
        out.write(json.dumps({"case": pkg + ".[build]", "pass": False}) + "\n")


BENCH_RE = re.compile(r"^(Benchmark\S+?)(?:-\d+)?\s+\d+\s+(.*)$")


def from_bench(stream, out, unit):
    """Converts `go test -bench` output to one row per benchmark: the median
    of its samples in the chosen unit, with the samples kept for inspection."""
    samples = {}
    for line in stream:
        m = BENCH_RE.match(line.strip())
        if not m:
            continue
        fields = m.group(2).split()
        for val, u in zip(fields[::2], fields[1::2]):
            if u == unit:
                samples.setdefault(m.group(1), []).append(float(val))
    for name in sorted(samples):
        s = samples[name]
        out.write(json.dumps({"case": name, "value": statistics.median(s),
                              "unit": unit, "samples": s}) + "\n")


# ------------------------------------------------------------------ main


def main(argv=None):
    p = argparse.ArgumentParser(description="hillclimb bookkeeping")
    p.add_argument("--root", default=".hillclimb")
    sub = p.add_subparsers(dest="cmd", required=True)

    def flow_cmd(name, fn, help_):
        sp = sub.add_parser(name, help=help_)
        sp.add_argument("flow")
        sp.set_defaults(fn=fn)
        return sp

    sp = flow_cmd("init", cmd_init, "create a flow")
    sp.add_argument("--kind", choices=["count", "value"], required=True,
                    help="count: pass/fail cases, higher is better; value: a "
                         "measurement per case, lower is better")
    sp.add_argument("--metric", required=True, help="what the score means, e.g. 'equal cases' or 'ns/op'")
    sp.add_argument("--judge", required=True, help="shell command that prints results.jsonl rows")
    sp.add_argument("--judge-path", action="append", default=[], help="file or dir the judge depends on")
    sp.add_argument("--guard", action="append", default=[], help="command that must exit 0 before judging")
    sp.add_argument("--held-pct", type=int, default=30)

    flow_cmd("approve", cmd_approve, "record the judge's hash (the user runs this)")
    flow_cmd("check", cmd_check, "exit 2 if the judge changed since approval")

    sp = flow_cmd("run", cmd_run, "check the judge, run guards, run the judge")
    sp.add_argument("rid")

    sp = flow_cmd("compare", cmd_compare, "score a round against the best kept round")
    sp.add_argument("rid")

    sp = flow_cmd("record", cmd_record, "append a round to the history")
    sp.add_argument("rid")
    sp.add_argument("--change", required=True)
    g = sp.add_mutually_exclusive_group(required=True)
    g.add_argument("--kept", action="store_true")
    g.add_argument("--reverted", dest="kept", action="store_false")
    sp.add_argument("--commit")

    sp = flow_cmd("noise", cmd_noise, "set the noise floor from two unchanged runs")
    sp.add_argument("a")
    sp.add_argument("b")
    sp.add_argument("--min", type=float, default=0.0)

    flow_cmd("status", cmd_status, "print the round table and write scores.tsv")

    sp = sub.add_parser("from-gotest", help="go test -json on stdin to rows")
    sp.set_defaults(fn=lambda a: from_gotest(sys.stdin, sys.stdout))
    sp = sub.add_parser("from-bench", help="go test -bench on stdin to rows")
    sp.add_argument("--unit", default="ns/op")
    sp.set_defaults(fn=lambda a: from_bench(sys.stdin, sys.stdout, a.unit))

    args = p.parse_args(argv)
    args.fn(args)


if __name__ == "__main__":
    main()
