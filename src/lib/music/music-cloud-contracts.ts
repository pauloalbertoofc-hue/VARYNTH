export function validMusicBlobPath(pathname: string, namespace: string) {
  return /^[a-f0-9]{32}$/i.test(namespace)
    && new RegExp(`^music/${namespace}/tracks/[a-f0-9-]{36}\\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|webm)(?![\\s\\S])`, "i").test(pathname);
}

export function validMusicArtworkBlobPath(pathname: string, namespace: string) {
  return /^[a-f0-9]{32}$/i.test(namespace)
    && new RegExp(`^music/${namespace}/artwork/[a-f0-9-]{36}\\.(png|jpe?g|webp|gif|avif|svg)(?![\\s\\S])`, "i").test(pathname);
}
