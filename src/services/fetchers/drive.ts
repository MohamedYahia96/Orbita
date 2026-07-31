import { ensureGoogleAccessToken } from "@/services/fetchers/gmail";

type DriveOwner = {
  displayName?: string;
  emailAddress?: string;
};

type DriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  description?: string;
  webViewLink?: string;
  modifiedTime?: string;
  createdTime?: string;
  iconLink?: string;
  owners?: DriveOwner[];
};

type DriveFolderResponse = {
  id?: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
  trashed?: boolean;
};

type DriveListResponse = {
  files?: DriveFile[];
  nextPageToken?: string;
};

type DriveFolderListEntry = {
  id?: string;
  name?: string;
  webViewLink?: string;
};

type DriveFolderListResponse = {
  files?: DriveFolderListEntry[];
};

export type DriveFetchedItem = {
  title: string;
  link: string;
  content: string;
  image: string | null;
  guid: string;
  pubDate: string;
  mediaType: "article" | "video" | "image";
  extraData: Record<string, unknown>;
};

export type DriveFetchResult = {
  email: string | null;
  folderId: string;
  folderName: string | null;
  items: DriveFetchedItem[];
};

export type DriveFolderOption = {
  id: string;
  name: string;
  url: string;
};

type ResolveDriveFolderForUserOptions = {
  userId: string;
  folderId?: string | null;
};

type FetchDriveFeedItemsOptions = {
  userId: string;
  folderId?: string | null;
  pageSize?: number;
};

type ListDriveFoldersOptions = {
  userId: string;
  searchQuery?: string | null;
  pageSize?: number;
};

type ResolvedDriveFolder = {
  folderId: string;
  folderName: string | null;
  folderUrl: string;
};

const DRIVE_API_BASE_URL = "https://www.googleapis.com/drive/v3";
const DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
export const DEFAULT_DRIVE_FOLDER_ID = "root";
export const DRIVE_DEFAULT_FAVICON =
  "https://www.google.com/s2/favicons?domain=drive.google.com&sz=128";

function normalizeDriveFolderId(folderId?: string | null) {
  const normalized = (folderId || DEFAULT_DRIVE_FOLDER_ID).trim();
  return normalized || DEFAULT_DRIVE_FOLDER_ID;
}

function buildDriveFolderUrl(folderId: string) {
  if (folderId === DEFAULT_DRIVE_FOLDER_ID) {
    return "https://drive.google.com/drive/my-drive";
  }

  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

function buildDriveFileUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

function mapDriveMimeTypeToMediaType(mimeType?: string) {
  if (!mimeType) return "article" as const;
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType.startsWith("video/")) return "video" as const;
  return "article" as const;
}

function escapeDriveQueryLiteral(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildDriveFileContent(file: DriveFile) {
  if (file.description && file.description.trim()) {
    return file.description.trim();
  }

  const owner = file.owners?.[0];
  const ownerName = owner?.displayName || owner?.emailAddress || "Unknown owner";
  const mimeType = file.mimeType || "unknown type";
  return `${mimeType} file by ${ownerName}`;
}

async function callDriveApi<T>(accessToken: string, url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const fallbackError = `Google Drive API request failed with status ${response.status}`;
    let errorMessage = fallbackError;

    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
        };
      };
      errorMessage = payload.error?.message || fallbackError;
    } catch {
      errorMessage = fallbackError;
    }

    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

async function resolveDriveFolder(
  accessToken: string,
  folderId?: string | null
): Promise<ResolvedDriveFolder> {
  const normalizedFolderId = normalizeDriveFolderId(folderId);
  const folderUrl = new URL(`${DRIVE_API_BASE_URL}/files/${encodeURIComponent(normalizedFolderId)}`);
  folderUrl.searchParams.set("fields", "id,name,mimeType,webViewLink,trashed");
  folderUrl.searchParams.set("supportsAllDrives", "true");

  const folder = await callDriveApi<DriveFolderResponse>(accessToken, folderUrl.toString());

  if (folder.trashed) {
    throw new Error("The selected Google Drive folder is in trash.");
  }

  if (folder.mimeType && folder.mimeType !== DRIVE_FOLDER_MIME_TYPE) {
    throw new Error("The selected Google Drive ID is not a folder.");
  }

  const resolvedFolderId = folder.id || normalizedFolderId;
  const resolvedFolderName = folder.name || null;

  return {
    folderId: resolvedFolderId,
    folderName: resolvedFolderName,
    folderUrl: folder.webViewLink || buildDriveFolderUrl(resolvedFolderId),
  };
}

export async function resolveDriveFolderForUser({
  userId,
  folderId,
}: ResolveDriveFolderForUserOptions) {
  const { accessToken, email } = await ensureGoogleAccessToken(userId);
  const resolvedFolder = await resolveDriveFolder(accessToken, folderId);

  return {
    email,
    ...resolvedFolder,
  };
}

export async function fetchDriveFeedItems({
  userId,
  folderId,
  pageSize = 25,
}: FetchDriveFeedItemsOptions): Promise<DriveFetchResult> {
  const { accessToken, email } = await ensureGoogleAccessToken(userId);
  const resolvedFolder = await resolveDriveFolder(accessToken, folderId);

  const boundedPageSize = Math.min(Math.max(Math.floor(pageSize), 1), 100);
  const listUrl = new URL(`${DRIVE_API_BASE_URL}/files`);
  listUrl.searchParams.set("q", `'${escapeDriveQueryLiteral(resolvedFolder.folderId)}' in parents and trashed = false`);
  listUrl.searchParams.set("orderBy", "modifiedTime desc");
  listUrl.searchParams.set("pageSize", String(boundedPageSize));
  listUrl.searchParams.set(
    "fields",
    "files(id,name,mimeType,description,webViewLink,modifiedTime,createdTime,iconLink,owners(displayName,emailAddress)),nextPageToken"
  );
  listUrl.searchParams.set("supportsAllDrives", "true");
  listUrl.searchParams.set("includeItemsFromAllDrives", "true");

  const listResponse = await callDriveApi<DriveListResponse>(accessToken, listUrl.toString());
  const files = listResponse.files || [];

  const items: DriveFetchedItem[] = files
    .filter((file): file is DriveFile & { id: string } => typeof file.id === "string" && file.id.length > 0)
    .map((file) => {
      const owner = file.owners?.[0];
      const ownerName = owner?.displayName || null;
      const ownerEmail = owner?.emailAddress || null;

      return {
        title: file.name || "Untitled file",
        link: file.webViewLink || buildDriveFileUrl(file.id),
        content: buildDriveFileContent(file),
        image: null,
        guid: file.id,
        pubDate: file.modifiedTime || file.createdTime || new Date().toISOString(),
        mediaType: mapDriveMimeTypeToMediaType(file.mimeType),
        extraData: {
          fileId: file.id,
          mimeType: file.mimeType || null,
          folderId: resolvedFolder.folderId,
          ownerName,
          ownerEmail,
          iconLink: file.iconLink || null,
          modifiedTime: file.modifiedTime || null,
          createdTime: file.createdTime || null,
        },
      };
    });

  return {
    email,
    folderId: resolvedFolder.folderId,
    folderName: resolvedFolder.folderName,
    items,
  };
}

export async function listDriveFoldersForUser({
  userId,
  searchQuery,
  pageSize = 100,
}: ListDriveFoldersOptions): Promise<DriveFolderOption[]> {
  const { accessToken } = await ensureGoogleAccessToken(userId);
  const boundedPageSize = Math.min(Math.max(Math.floor(pageSize), 1), 200);

  const queryParts = [
    `mimeType = '${DRIVE_FOLDER_MIME_TYPE}'`,
    "trashed = false",
  ];

  if (searchQuery && searchQuery.trim()) {
    queryParts.push(`name contains '${escapeDriveQueryLiteral(searchQuery.trim())}'`);
  }

  const listUrl = new URL(`${DRIVE_API_BASE_URL}/files`);
  listUrl.searchParams.set("q", queryParts.join(" and "));
  listUrl.searchParams.set("orderBy", "name_natural asc");
  listUrl.searchParams.set("pageSize", String(boundedPageSize));
  listUrl.searchParams.set("fields", "files(id,name,webViewLink)");
  listUrl.searchParams.set("supportsAllDrives", "true");
  listUrl.searchParams.set("includeItemsFromAllDrives", "true");

  const response = await callDriveApi<DriveFolderListResponse>(accessToken, listUrl.toString());
  const folders = (response.files || [])
    .filter((file): file is DriveFolderListEntry & { id: string; name: string } => {
      return typeof file.id === "string" && file.id.trim().length > 0 && typeof file.name === "string";
    })
    .map((file) => ({
      id: file.id,
      name: file.name,
      url: file.webViewLink || buildDriveFolderUrl(file.id),
    }));

  const root: DriveFolderOption = {
    id: DEFAULT_DRIVE_FOLDER_ID,
    name: "My Drive",
    url: buildDriveFolderUrl(DEFAULT_DRIVE_FOLDER_ID),
  };

  const withoutRoot = folders.filter((folder) => folder.id !== DEFAULT_DRIVE_FOLDER_ID);
  return [root, ...withoutRoot];
}
