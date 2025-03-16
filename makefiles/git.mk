GIT_COMMAND_SCRIPTS=./scripts/git/cmd

##
## * Git Specific Targets

## make git-add-patch; - stage git changes via patch add command
.PHONY: git-add-patch
git-add-patch:
	git add -p

## make git-prune-branches; - prune local branches
.PHONY: git-prune-branches
git-prune-branches:
	$(GIT_COMMAND_SCRIPTS) prune_branches

## make git-clean; - remove untracked files
.PHONY: git-clean
git-clean:
	git clean -fd
