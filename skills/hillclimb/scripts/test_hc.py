#!/usr/bin/env python3
"""Tests for hc.py. Run: python3 -m unittest test_hc (from this directory)."""

import io
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hc  # noqa: E402

HC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "hc.py")


class FlowTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        self.root = os.path.join(self.tmp, ".hillclimb")
        self.judge = os.path.join(self.tmp, "judge.sh")
        with open(self.judge, "w") as f:
            f.write("#!/bin/sh\ncat %s\n" % os.path.join(self.tmp, "next.jsonl"))
        os.chmod(self.judge, 0o755)

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def hc(self, *args, check=True):
        cp = subprocess.run([sys.executable, HC, "--root", self.root] + list(args),
                            capture_output=True, text=True, cwd=self.tmp)
        if check and cp.returncode != 0:
            self.fail("hc %s failed: %s" % (args, cp.stderr))
        return cp

    def init(self, kind="count", guard=None):
        args = ["init", "f", "--kind", kind, "--metric", "m", "--judge", self.judge,
                "--judge-path", self.judge, "--held-pct", "50"]
        for g in guard or []:
            args += ["--guard", g]
        self.hc(*args)
        self.hc("approve", "f")

    def judge_returns(self, rows):
        with open(os.path.join(self.tmp, "next.jsonl"), "w") as f:
            for r in rows:
                f.write(json.dumps(r) + "\n")

    def state(self):
        return hc.load_state(os.path.join(self.root, "f"))

    def cases_by_split(self, n=40):
        held, train = [], []
        for i in range(n):
            c = "case%02d" % i
            (held if hc.is_held("f", c, 50) else train).append(c)
        return train, held


class TestSplit(unittest.TestCase):
    def test_split_is_stable_and_roughly_sized(self):
        cases = ["c%d" % i for i in range(2000)]
        first = [hc.is_held("flow", c, 30) for c in cases]
        self.assertEqual(first, [hc.is_held("flow", c, 30) for c in cases])
        frac = sum(first) / len(cases)
        self.assertGreater(frac, 0.25)
        self.assertLess(frac, 0.35)

    def test_split_depends_on_flow(self):
        cases = ["c%d" % i for i in range(200)]
        a = [hc.is_held("a", c, 50) for c in cases]
        b = [hc.is_held("b", c, 50) for c in cases]
        self.assertNotEqual(a, b)

    def test_zero_and_full(self):
        self.assertFalse(hc.is_held("f", "x", 0))
        self.assertTrue(hc.is_held("f", "x", 100))


class TestScoring(unittest.TestCase):
    def state(self, kind, noise=0.0):
        return {"flow": "f", "held_pct": 0, "goal": {"kind": kind}, "noise": noise}

    def test_missing_case_counts_as_failure(self):
        st = self.state("count")
        base = {"a": {"case": "a", "pass": True}, "b": {"case": "b", "pass": False}}
        cur = {"a": {"case": "a", "pass": True}}  # b deleted, c added
        cur["c"] = {"case": "c", "pass": True}
        sc = hc.split_scores(st, cur, base)
        self.assertEqual(sc["train"], 0.5)
        self.assertEqual(sc["train_n"], 2)

    def test_errors_leave_the_denominator(self):
        st = self.state("count")
        base = {"a": {"case": "a", "pass": True}, "b": {"case": "b", "pass": True}}
        cur = {"a": {"case": "a", "pass": True}, "b": {"case": "b", "error": "timeout"}}
        sc = hc.split_scores(st, cur, base)
        self.assertEqual(sc["train"], 1.0)
        self.assertEqual(sc["train_n"], 1)

    def test_value_geomean_of_ratios(self):
        st = self.state("value")
        base = {"a": {"case": "a", "value": 100.0}, "b": {"case": "b", "value": 10.0}}
        cur = {"a": {"case": "a", "value": 50.0}, "b": {"case": "b", "value": 20.0}}
        sc = hc.split_scores(st, cur, base)
        self.assertAlmostEqual(sc["train"], 1.0)  # 0.5x and 2x cancel

    def test_vanished_benchmark_is_lost(self):
        st = self.state("value")
        base = {"a": {"case": "a", "value": 100.0}}
        sc = hc.split_scores(st, {}, base)
        self.assertTrue(math.isinf(sc["train"]))
        self.assertFalse(hc.better(st, sc["train"], 1.0))
        self.assertTrue(hc.better(st, 1.0, sc["train"]))

    def test_empty_split_is_none(self):
        st = self.state("count")
        sc = hc.split_scores(st, {}, {"a": {"case": "a", "pass": True}})
        self.assertIsNone(sc["held"])
        self.assertFalse(hc.better(st, None, 0.5))

    def test_noise_gates_better(self):
        st = self.state("count", noise=0.05)
        self.assertFalse(hc.better(st, 0.54, 0.50))
        self.assertTrue(hc.better(st, 0.56, 0.50))
        self.assertTrue(hc.worse(st, 0.44, 0.50))

    def test_value_lower_is_better(self):
        st = self.state("value", noise=0.02)
        self.assertTrue(hc.better(st, 0.9, 1.0))
        self.assertFalse(hc.better(st, 0.99, 1.0))
        self.assertTrue(hc.worse(st, 1.1, 1.0))


class TestAdapters(unittest.TestCase):
    def test_from_gotest(self):
        events = [
            {"Action": "run", "Package": "p", "Test": "TestA"},
            {"Action": "pass", "Package": "p", "Test": "TestA"},
            {"Action": "fail", "Package": "p", "Test": "TestB"},
            {"Action": "skip", "Package": "p", "Test": "TestC"},
            {"Action": "fail", "Package": "p"},
            {"Action": "fail", "Package": "broken"},
        ]
        src = io.StringIO("\n".join(json.dumps(e) for e in events) + "\nnot json\n")
        out = io.StringIO()
        hc.from_gotest(src, out)
        rows = [json.loads(l) for l in out.getvalue().splitlines()]
        self.assertEqual(rows, [
            {"case": "p.TestA", "pass": True},
            {"case": "p.TestB", "pass": False},
            {"case": "p.TestC", "error": "skipped"},
            {"case": "broken.[build]", "pass": False},
        ])

    def test_from_bench(self):
        src = io.StringIO(
            "goos: darwin\n"
            "BenchmarkFind-8   100   300 ns/op   64 B/op   2 allocs/op\n"
            "BenchmarkFind-8   100   100 ns/op   64 B/op   2 allocs/op\n"
            "BenchmarkFind-8   100   200 ns/op   64 B/op   2 allocs/op\n"
            "BenchmarkOther    10    5 ns/op\n"
            "PASS\n")
        out = io.StringIO()
        hc.from_bench(src, out, "ns/op")
        rows = [json.loads(l) for l in out.getvalue().splitlines()]
        self.assertEqual(rows[0]["case"], "BenchmarkFind")
        self.assertEqual(rows[0]["value"], 200.0)
        self.assertEqual(rows[1], {"case": "BenchmarkOther", "value": 5.0,
                                   "unit": "ns/op", "samples": [5.0]})
        out = io.StringIO()
        src.seek(0)
        hc.from_bench(src, out, "allocs/op")
        self.assertEqual(json.loads(out.getvalue().splitlines()[0])["value"], 2.0)


class TestLoop(FlowTest):
    def test_full_round_keep_then_revert(self):
        self.init()
        train, held = self.cases_by_split()
        all_cases = train + held

        # Baseline: everything fails except the first half of each split.
        def rows(passing):
            return [{"case": c, "pass": c in passing} for c in all_cases]

        base_pass = set(train[: len(train) // 2]) | set(held[: len(held) // 2])
        self.judge_returns(rows(base_pass))
        self.hc("run", "f", "baseline")

        # Round 1 fixes more train cases and one held case: keep.
        r1 = base_pass | set(train[len(train) // 2:]) | {held[-1]}
        self.judge_returns(rows(r1))
        self.hc("run", "f", "r01")
        out = self.hc("compare", "f", "r01").stdout
        self.assertIn("KEEP", out)
        self.hc("record", "f", "r01", "--change", "fix nulls", "--kept", "--commit", "abc")

        # Round 2 gains nothing on train but breaks held cases: revert.
        r2 = r1 - set(held[: len(held) // 2])
        self.judge_returns(rows(r2))
        self.hc("run", "f", "r02")
        out = self.hc("compare", "f", "r02").stdout
        self.assertIn("vs r01", out)
        self.assertIn("REVERT: held-out regressed", out)
        self.hc("record", "f", "r02", "--change", "cache", "--reverted")

        st = self.state()
        self.assertEqual([r["kept"] for r in st["rounds"]], [True, False])
        status = self.hc("status", "f").stdout
        self.assertIn("Best kept: r01", status)
        self.assertIn("| r02 | cache | no |", status)
        with open(os.path.join(self.root, "f", "scores.tsv")) as f:
            lines = f.read().splitlines()
        self.assertEqual(lines[0], "case\tsplit\tbaseline\tr01\tr02")
        self.assertEqual(len(lines), len(all_cases) + 1)

        dup = self.hc("record", "f", "r01", "--change", "x", "--kept", check=False)
        self.assertNotEqual(dup.returncode, 0)

    def test_flat_round_is_reverted_and_noise_case(self):
        self.init()
        train, held = self.cases_by_split()
        self.judge_returns([{"case": c, "pass": False} for c in train + held])
        self.hc("run", "f", "baseline")
        self.hc("run", "f", "r01")
        self.assertIn("REVERT: no gain", self.hc("compare", "f", "r01").stdout)
        self.judge_returns([{"case": c, "pass": c == held[0]} for c in train + held])
        self.hc("run", "f", "r02")
        self.assertIn("NOISE", self.hc("compare", "f", "r02").stdout)

    def test_judge_change_blocks_run(self):
        self.init()
        self.judge_returns([{"case": "a", "pass": True}])
        self.hc("run", "f", "baseline")
        with open(self.judge, "a") as f:
            f.write("# edited\n")
        cp = self.hc("run", "f", "r01", check=False)
        self.assertEqual(cp.returncode, hc.EXIT_JUDGE_CHANGED)
        self.assertEqual(self.hc("check", "f", check=False).returncode, hc.EXIT_JUDGE_CHANGED)
        self.hc("approve", "f")
        self.hc("check", "f")

    def test_unapproved_judge_blocks_run(self):
        self.hc("init", "f", "--kind", "count", "--metric", "m", "--judge", self.judge,
                "--judge-path", self.judge)
        cp = self.hc("run", "f", "baseline", check=False)
        self.assertEqual(cp.returncode, hc.EXIT_JUDGE_CHANGED)
        self.assertIn("not approved", cp.stderr)

    def test_deleted_judge_file_is_a_change(self):
        self.init()
        os.remove(self.judge)
        self.assertEqual(self.hc("check", "f", check=False).returncode, hc.EXIT_JUDGE_CHANGED)

    def test_judge_dir_hashing(self):
        d = os.path.join(self.tmp, "golden")
        os.makedirs(d)
        with open(os.path.join(d, "a.out"), "w") as f:
            f.write("one")
        before = hc.judge_sha([d])
        with open(os.path.join(d, "a.out"), "w") as f:
            f.write("two")
        self.assertNotEqual(before, hc.judge_sha([d]))

    def test_failing_guard_stops_round(self):
        self.init(guard=["true", "exit 3"])
        self.judge_returns([{"case": "a", "pass": True}])
        cp = self.hc("run", "f", "baseline", check=False)
        self.assertEqual(cp.returncode, 1)
        self.assertIn("guard failed (exit 3)", cp.stderr)
        self.assertFalse(os.path.exists(os.path.join(self.root, "f", "rounds", "baseline", "results.jsonl")))

    def test_empty_judge_output_fails(self):
        self.init()
        self.judge_returns([])
        cp = self.hc("run", "f", "baseline", check=False)
        self.assertNotEqual(cp.returncode, 0)
        self.assertIn("no rows", cp.stderr)

    def test_init_twice_fails(self):
        self.init()
        cp = self.hc("init", "f", "--kind", "count", "--metric", "m", "--judge", "x", check=False)
        self.assertNotEqual(cp.returncode, 0)

    def test_noise_from_two_baselines(self):
        self.init()
        cases = ["c%d" % i for i in range(10)]
        self.judge_returns([{"case": c, "pass": True} for c in cases])
        self.hc("run", "f", "baseline")
        self.judge_returns([{"case": c, "pass": c != "c0"} for c in cases])
        self.hc("run", "f", "baseline2")
        self.assertIn("0.1000", self.hc("noise", "f", "baseline", "baseline2").stdout)
        self.assertAlmostEqual(self.state()["noise"], 0.1)

    def test_value_noise_and_min(self):
        self.init(kind="value")
        self.judge_returns([{"case": "b", "value": 100.0}])
        self.hc("run", "f", "baseline")
        self.judge_returns([{"case": "b", "value": 110.0}])
        self.hc("run", "f", "baseline2")
        self.hc("noise", "f", "baseline", "baseline2")
        self.assertAlmostEqual(self.state()["noise"], math.log(1.1))
        self.hc("noise", "f", "baseline", "baseline2", "--min", "0.5")
        self.assertEqual(self.state()["noise"], 0.5)


if __name__ == "__main__":
    unittest.main()
