export interface SyncVersion {
  updatedAt: number;
  cloudRevision?: number;
}

function revision(value: SyncVersion) {
  return Math.max(0, Math.floor(Number(value.cloudRevision) || 0));
}

export function compareSyncVersions(left: SyncVersion, right: SyncVersion) {
  if (left.updatedAt !== right.updatedAt) return left.updatedAt > right.updatedAt ? 1 : -1;
  const leftRevision = revision(left);
  const rightRevision = revision(right);
  return leftRevision === rightRevision ? 0 : leftRevision > rightRevision ? 1 : -1;
}

export function remoteWinsConcurrentWrite(local: SyncVersion, remote: SyncVersion) {
  const localRevision = revision(local);
  const remoteRevision = revision(remote);
  const remoteChangedSinceLocalBase = remoteRevision > localRevision
    || localRevision === 0 && remoteRevision === 0 && remote.updatedAt !== local.updatedAt;
  return remoteChangedSinceLocalBase && compareSyncVersions(remote, local) >= 0;
}
