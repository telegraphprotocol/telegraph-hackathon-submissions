export interface MinerRecordApi {
  RegistrationID?: number | string;
  MinerAddress?: string;
  YamlRaw?: string | null;
  [key: string]: unknown;
}

export interface WasmRecordApi {
  RegistrationID?: number | string;
  AuthorAddress?: string;
  [key: string]: unknown;
}

export interface AddressBundleResponse {
  miners: MinerRecordApi[];
  wasm: WasmRecordApi[];
}

const ID_KEYS = ["RegistrationID", "id", "minerId", "wasmId", "registrationId"] as const;

function extractYamlMinerId(yamlRaw: string | null | undefined): string | null {
  if (!yamlRaw) return null;
  const match = yamlRaw.match(/^id:\s*(\S+)\s*$/m);
  return match ? match[1] : null;
}

export function recordMatchesId(record: MinerRecordApi | WasmRecordApi, id: string): boolean {
  const directMatch = ID_KEYS.some((key) => {
    const value = record[key];
    return value !== undefined && String(value) === id;
  });
  if (directMatch) return true;

  const yamlMinerId = extractYamlMinerId((record as MinerRecordApi).YamlRaw);
  return yamlMinerId !== null && yamlMinerId === id;
}
