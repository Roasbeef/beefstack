
.PHONY: doc-check
doc-check: ## Check the doc graph (coverage, AGENTS.md mirror, staleness, citations)
	@scripts/doc_check.sh
