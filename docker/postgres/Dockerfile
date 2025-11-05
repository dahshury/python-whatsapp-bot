FROM postgres:16

ARG DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    make \
    python3 \
    python3-dev \
    python3-pip \
    python3-boto3 \
    postgresql-server-dev-16 \
    postgresql-plpython3-16 \
 && rm -rf /var/lib/apt/lists/*

RUN git clone --depth=1 https://github.com/chimpler/postgres-aws-s3.git /tmp/postgres-aws-s3 \
 && make -C /tmp/postgres-aws-s3 install \
 && rm -rf /tmp/postgres-aws-s3

COPY docker/postgres/initdb/ /docker-entrypoint-initdb.d/

