#!/usr/bin/env sh

echo $(tput reset)

echo "$(tput setab 5)$(tput setaf 15)$(tput bold) running linter $(tput sgr0)"
npm run --silent lint

status=$?

[ $status -eq 0 ] && {
  echo "$(tput setab 5)$(tput setaf 15)$(tput bold) running code $(tput sgr0)"
  npm run --silent start:node
  run_status=$?
  [ $run_status -eq 0 ] || {
    echo "$(tput setab 1)$(tput setaf 15)$(tput bold) execution error $(tput sgr0)"
  }
} || {
  echo "$(tput setab 1)$(tput setaf 15)$(tput bold) linting error $(tput sgr0)"
}
