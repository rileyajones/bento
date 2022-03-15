/**
 * @fileoverview Provides functions for executing various git commands.
 */

import {
  ciPullRequestBranch,
  ciPullRequestSha,
  isCiBuild,
  isPullRequestBuild,
} from './ci';
import {getStdout} from './process';

/**
 * Returns the commit at which the current PR branch was forked off of the main
 * branch. During CI, there is an additional merge commit, so we must pick the
 * first of the boundary commits (prefixed with a -) returned by git rev-list.
 * On local branches, this is merge base of the current branch off of the main
 * branch.
 */
export function gitBranchCreationPoint(): string {
  if (isPullRequestBuild()) {
    const prSha = ciPullRequestSha();
    return getStdout(
      `git rev-list --boundary ${prSha}...origin/main | grep "^-" | head -n 1 | cut -c2-`
    ).trim();
  }
  return gitMergeBaseLocalMain();
}

/**
 * Returns the main branch parent of the merge commit (current HEAD) during CI
 * builds. This is not the same as origin/<main branch> (a moving target), since
 * new commits can be merged while a CI build is in progress.
 */
export function gitCiMainBaseline(): string {
  return getStdout('git merge-base origin/main HEAD').trim();
}

/**
 * Shortens a commit SHA to 7 characters for human readability.
 * @param {string} sha 40 characters SHA.
 * @return {string} 7 characters SHA.
 */
export function shortSha(sha: string): string {
  return sha.substr(0, 7);
}

/**
 * Returns the list of files changed but not committed to the local branch, one
 * on each line.
 */
export function gitDiffNameOnly(): string[] {
  return getStdout('git diff --name-only').trim().split('\n');
}

/**
 * Returns the list of files changed relative to the branch point off of the
 * main branch, one on each line.
 */
export function gitDiffNameOnlyMain(): string[] {
  const mainBaseline = gitMainBaseline();
  return getStdout(`git diff --name-only ${mainBaseline}`).trim().split('\n');
}

/**
 * Returns the list of files changed relative to the branch point off of the
 * main branch in diffstat format.
 */
export function gitDiffStatMain(): string {
  const mainBaseline = gitMainBaseline();
  return getStdout(`git -c color.ui=always diff --stat ${mainBaseline}`);
}

/**
 * Returns a detailed log of commits included in a PR check, starting with (and
 * including) the branch point off of the main branch. Limited to commits in the
 * past 30 days to keep the output length manageable.
 */
export function gitDiffCommitLog(): string {
  const branchCreationPoint = gitBranchCreationPoint();
  const commitLog = getStdout(`git -c color.ui=always log --graph \
--pretty=format:"%C(red)%h%C(reset) %C(bold cyan)%an%C(reset) \
-%C(yellow)%d%C(reset) %C(reset)%s%C(reset) %C(green)(%cr)%C(reset)" \
--abbrev-commit ${branchCreationPoint}^...HEAD --since "30 days ago"`).trim();
  return commitLog;
}

/**
 * Returns the list of files added by the local branch relative to the branch
 * point off of the main branch, one on each line.
 */
export function gitDiffAddedNameOnlyMain(): string[] {
  const branchPoint = gitMergeBaseLocalMain();
  return getStdout(`git diff --name-only --diff-filter=ARC ${branchPoint}`)
    .trim()
    .split('\n');
}

/**
 * Returns the full color diff of the uncommited changes on the local branch.
 */
export function gitDiffColor(): string {
  return getStdout('git -c color.ui=always diff').trim();
}

/**
 * Returns the full color diff of the given file relative to the branch point
 * off of the main branch.
 */
export function gitDiffFileMain(file: string): string {
  const mainBaseline = gitMainBaseline();
  return getStdout(`git -c color.ui=always diff -U1 ${mainBaseline} ${file}`);
}

/**
 * Returns the name of the branch from which the PR originated.
 */
export function gitBranchName(): string {
  return isPullRequestBuild()
    ? ciPullRequestBranch()
    : getStdout('git rev-parse --abbrev-ref HEAD').trim();
}

/**
 * Returns the commit hash of the latest commit.
 */
export function gitCommitHash(): string {
  if (isPullRequestBuild()) {
    return ciPullRequestSha();
  }
  return getStdout('git rev-parse --verify HEAD').trim();
}

/**
 * Returns the email of the author of the latest commit on the local branch.
 */
export function gitCommitterEmail(): string {
  return getStdout('git log -1 --pretty=format:"%ae"').trim();
}

/**
 * Returns list of commit SHAs and their cherry-pick status from the main
 * branch.
 *
 * `git cherry <branch>` returns a list of commit SHAs. While the exact
 * mechanism is too complicated for this comment (run `git help cherry` for a
 * full explanation), the gist of it is that commits that were cherry-picked
 * from <branch> are prefixed with '- ', and those that were not are prefixed
 * with '+ '.
 */
export function gitCherryMain(ref = 'HEAD'): string[] {
  const stdout = getStdout(`git cherry main ${ref}`).trim();
  return stdout ? stdout.split('\n') : [];
}

/**
 * Returns (UTC) time of a commit on the local branch, in %y%m%d%H%M%S format.
 *
 * @param {string} ref a Git reference (commit SHA, branch name, etc.) for the
 *   commit to get the time of.
 * @return {string}
 */
export function gitCommitFormattedTime(ref = 'HEAD'): string {
  const envPrefix = process.platform == 'win32' ? 'set TZ=UTC &&' : 'TZ=UTC';
  return getStdout(
    `${envPrefix} git log ${ref} -1 --pretty="%cd" --date=format-local:%y%m%d%H%M%S`
  ).trim();
}

/**
 * Returns the merge base of the current branch off of the main branch when
 * running on a local workspace.
 */
export function gitMergeBaseLocalMain(): string {
  return getStdout('git merge-base main HEAD').trim();
}

/**
 * Returns the baseline commit from the main branch, regardless of running
 * environment.
 */
export function gitMainBaseline(): string {
  if (isCiBuild()) {
    return gitCiMainBaseline();
  }
  return gitMergeBaseLocalMain();
}

/**
 * Returns the diffs for given path based on the given commit
 */
export function gitDiffPath(path: string, commit: string): string {
  return getStdout(`git diff ${commit} ${path}`).trim();
}
