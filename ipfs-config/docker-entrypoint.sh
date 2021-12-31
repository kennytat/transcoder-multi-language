#!/bin/bash
set -euo pipefail
set -o errexit
set -o errtrace
IFS=$'\n\t'

export S3_ACL=${S3_ACL:-private}

test $MOUNT_POINT
rm -rf ${MOUNT_POINT}
mkdir -p ${MOUNT_POINT}

if [ "$IAM_ROLE" == "none" ]; then
  #export AWSACCESSKEYID=${AWSACCESSKEYID:-$AWS_ACCESS_KEY_ID}
  #export AWSSECRETACCESSKEY=${AWSSECRETACCESSKEY:-$AWS_SECRET_ACCESS_KEY}
  #export ENDPOINT_URL=${ENDPOINT_URL:-$ENDPOINT_URL}
  echo "$AWSACCESSKEYID:$AWSSECRETACCESSKEY" > ${HOME}/.passwd-s3fs
  chmod 600 ${HOME}/.passwd-s3fs
  cat ${HOME}/.passwd-s3fs

  echo 'IAM_ROLE is not set - mounting S3 with credentials from ENV'
  #/usr/bin/s3fs ${S3_BUCKET} ${MOUNT_POINT} -o url=${ENDPOINT_URL} -o use_path_request_type -o nosuid,nonempty,nodev,allow_other,default_acl=${S3_ACL},retries=5
  /usr/bin/s3fs ${S3_BUCKET} ${MOUNT_POINT} -o passwd_file=${HOME}/.passwd-s3fs -o url=${ENDPOINT_URL} -o use_path_request_style

else
  echo 'IAM_ROLE is set - using it to mount S3'
  /usr/bin/s3fs ${S3_BUCKET} ${MOUNT_POINT} -o iam_role=${IAM_ROLE},nosuid,nonempty,nodev,allow_other,default_acl=${S3_ACL},retries=5
fi

exec "$@"
