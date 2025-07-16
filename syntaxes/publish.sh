#!/usr/bin/env bash
set -x

if ! git diff --cached --exit-code; then
  echo "There are uncommitted changes. Please commit or stash them before running this script."
  exit 1
fi

CURRENT=$(git branch --show-current)
CURRENT_HASH="ba347def950c46bc84971ae4aa47ab7622b2bbf6" #$(git rev-parse HEAD)

git remote add --no-tags publish-docs git@github.com:apollographql/docs-rewrite -t main || true
#git fetch publish-docs --depth 1
git switch -C publish-docs/$CURRENT_HASH publish-docs/main

update_file(){

  if ! diff -q <(jq . <(git show $CURRENT_HASH:$1)) <(jq '.|del(._source)' < $2); then
    echo "connectors.mapping.json has changed, updating..."
    jq '{"_source":"https://github.com/apollographql/vscode-graphql/blob/'${CURRENT_HASH}'/'$1'"} + .' <(git show $CURRENT_HASH:$1) > $2
    git add $2
  else
    echo "connectors.mapping.json is up to date."
  fi
}

update_file syntaxes/connectors.mapping.json src/code-highlighting/grammars/connectors.mapping.json

git diff --cached --shortstat
update_file syntaxes/graphql.connectors.json src/code-highlighting/grammars/graphql.connectors.json
update_file syntaxes/graphql.json src/code-highlighting/grammars/graphql.json

git diff --cached --shortstat

if ! git diff --cached --exit-code; then
  git commit -m "Update Syntax Highlighting\n source: https://github.com/apollographql/vscode-graphql/blob/${CURRENT_HASH}"
  git push -u publish-docs publish-docs/$CURRENT_HASH:sync-vscode-graphql/$CURRENT_HASH
  gh -R apollographql/docs-rewrite pr create --head sync-vscode-graphql/$CURRENT_HASH --title "Update Syntax Highlighting" --body "This PR updates the syntax highlighting files to match the latest changes in the vscode-graphql repository."
else
  echo "No changes to commit."
fi

git switch $CURRENT
