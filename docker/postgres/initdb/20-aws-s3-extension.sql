\echo 'Initializing aws_s3 extension and custom backup helpers'

CREATE EXTENSION IF NOT EXISTS plpython3u;
CREATE EXTENSION IF NOT EXISTS aws_s3;

CREATE OR REPLACE FUNCTION aws_s3.pg_dump_to_s3(
    database_url text,
    bucket text,
    object_key text,
    region text default null,
    access_key text default null,
    secret_key text default null,
    session_token text default null,
    sse_algorithm text default null,
    kms_key_id text default null,
    endpoint_url text default null,
    pg_dump_options text default null,
    compression text default 'gzip'
)
RETURNS TABLE(bytes_uploaded bigint, compression_used text, object_key text)
LANGUAGE plpython3u
AS $$
    def cache_import(module_name):
        module_cache = SD.get('__modules__', {})
        if module_name in module_cache:
            return module_cache[module_name]

        import importlib

        loaded = importlib.import_module(module_name)
        module_cache[module_name] = loaded
        SD['__modules__'] = module_cache
        return loaded

    import os
    import shlex
    import tempfile

    boto3 = cache_import('boto3')
    subprocess = cache_import('subprocess')
    gzip = cache_import('gzip')
    shutil = cache_import('shutil')
    urllib_parse = cache_import('urllib.parse')

    def _normalize_url(url_text):
        if not url_text:
            raise plpy.Error('database_url must be provided')

        normalized = url_text
        replacements = (
            ('postgresql+psycopg://', 'postgresql://'),
            ('postgresql+asyncpg://', 'postgresql://'),
            ('postgresql+psycopgbinary://', 'postgresql://'),
        )
        for needle, replacement in replacements:
            if normalized.startswith(needle):
                normalized = normalized.replace(needle, replacement, 1)
                break
        return normalized

    normalized_url = _normalize_url(database_url)
    parsed = urllib_parse.urlparse(normalized_url)

    if not parsed.scheme.startswith('postgresql'):
        raise plpy.Error('database_url must use a PostgreSQL scheme')

    dump_target = normalized_url

    pg_dump_cmd = [
        'pg_dump',
        '--format=plain',
        '--no-owner',
        '--no-privileges',
        f'--dbname={dump_target}',
    ]

    if pg_dump_options:
        pg_dump_cmd.extend(shlex.split(pg_dump_options))

    env = dict(os.environ)

    if parsed.password:
        env['PGPASSWORD'] = urllib_parse.unquote(parsed.password)

    if parsed.hostname:
        env['PGHOST'] = parsed.hostname
    if parsed.port:
        env['PGPORT'] = str(parsed.port)
    if parsed.username:
        env['PGUSER'] = urllib_parse.unquote(parsed.username)

    temp_dir = tempfile.mkdtemp(prefix='aws_s3_pg_dump_')
    raw_dump_path = os.path.join(temp_dir, 'backup.sql')

    try:
        with open(raw_dump_path, 'wb') as dump_file:
            completed = subprocess.run(
                pg_dump_cmd,
                stdout=dump_file,
                stderr=subprocess.PIPE,
                check=False,
                env=env,
            )

        if completed.returncode != 0:
            stderr_output = completed.stderr.decode('utf-8', errors='replace')
            raise plpy.Error(f'pg_dump failed with exit code {completed.returncode}: {stderr_output}')

        upload_path = raw_dump_path
        compression_label = None

        if compression:
            normalized_compression = compression.lower()
            if normalized_compression == 'gzip':
                gzip_path = raw_dump_path + '.gz'
                with open(raw_dump_path, 'rb') as source, gzip.open(gzip_path, 'wb', compresslevel=9) as target:
                    shutil.copyfileobj(source, target)
                os.remove(raw_dump_path)
                upload_path = gzip_path
                compression_label = 'gzip'
            elif normalized_compression in ('', 'none'):
                compression_label = 'none'
            else:
                raise plpy.Error(f'Unsupported compression value: {compression}')
        else:
            compression_label = 'none'

        extra_args = {}
        if sse_algorithm:
            extra_args['ServerSideEncryption'] = sse_algorithm
        if kms_key_id:
            extra_args['SSEKMSKeyId'] = kms_key_id

        client = boto3.client(
            's3',
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            aws_session_token=session_token,
            endpoint_url=endpoint_url,
        )

        upload_kwargs = {'ExtraArgs': extra_args} if extra_args else {}
        client.upload_file(upload_path, bucket, object_key, **upload_kwargs)

        file_size = os.path.getsize(upload_path)

        yield (file_size, compression_label, object_key)

    finally:
        try:
            if os.path.exists(raw_dump_path):
                os.remove(raw_dump_path)
            if 'upload_path' in locals() and os.path.exists(upload_path) and upload_path != raw_dump_path:
                os.remove(upload_path)
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            plpy.warning('Failed to clean temporary backup files')
$$;

