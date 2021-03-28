#!/usr/bin/sh

echo $(tput reset)

echo "$(tput setab 5)$(tput setaf 15)$(tput bold)running linter$(tput sgr0)"
npm run --silent lint

echo "$(tput setab 5)$(tput setaf 15)$(tput bold)running code$(tput sgr0)"
npm run --silent start:node

