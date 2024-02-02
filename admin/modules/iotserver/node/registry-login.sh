#!/bin/bash
set -ex
eval $(aws --profile=bamboo ecr get-login --no-include-email --registry-ids 922959455388 --region us-east-1)
