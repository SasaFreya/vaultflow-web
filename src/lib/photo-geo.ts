/** 从 JPEG Data URL 尝试读取 GPS（简化 EXIF 扫描） */
export async function extractGeoFromDataUrl(
  dataUrl: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
    const binary = atob(base64);
    const len = Math.min(binary.length, 512 * 1024);
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

    let offset = 2;
    while (offset < len - 4) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (marker === 0xe1) {
        const header = String.fromCharCode(...bytes.slice(offset + 4, offset + 10));
        if (header.startsWith('Exif')) {
          const gps = parseExifGps(bytes, offset + 4, segLen - 2);
          if (gps) return gps;
        }
      }
      offset += 2 + segLen;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function parseExifGps(
  bytes: Uint8Array,
  start: number,
  length: number,
): { lat: number; lng: number } | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset + start, length);
    const le = view.getUint16(0) === 0x4949;
    const tiff = 6;
    const ifd0 = view.getUint32(tiff + 4, le);
    const gpsIfdPtr = readIfdGpsPointer(view, tiff + ifd0, le);
    if (!gpsIfdPtr) return null;
    return readGpsCoords(view, tiff + gpsIfdPtr, le);
  } catch {
    return null;
  }
}

function readIfdGpsPointer(view: DataView, ifdOffset: number, le: boolean): number | null {
  const count = view.getUint16(ifdOffset, le);
  for (let i = 0; i < count; i++) {
    const entry = ifdOffset + 2 + i * 12;
    const tag = view.getUint16(entry, le);
    if (tag === 0x8825) return view.getUint32(entry + 8, le);
  }
  return null;
}

function readGpsCoords(
  view: DataView,
  gpsIfd: number,
  le: boolean,
): { lat: number; lng: number } | null {
  let latRef = 'N';
  let lngRef = 'E';
  let lat: number | null = null;
  let lng: number | null = null;
  const count = view.getUint16(gpsIfd, le);
  for (let i = 0; i < count; i++) {
    const entry = gpsIfd + 2 + i * 12;
    const tag = view.getUint16(entry, le);
    const type = view.getUint16(entry + 2, le);
    const valOff = view.getUint32(entry + 8, le);
    if (tag === 1 && type === 2) latRef = String.fromCharCode(view.getUint8(entry + 8));
    if (tag === 3 && type === 2) lngRef = String.fromCharCode(view.getUint8(entry + 8));
    if (tag === 2 && type === 5) lat = readRationalTriple(view, valOff, le);
    if (tag === 4 && type === 5) lng = readRationalTriple(view, valOff, le);
  }
  if (lat == null || lng == null) return null;
  if (latRef === 'S') lat = -lat;
  if (lngRef === 'W') lng = -lng;
  return { lat, lng };
}

function readRationalTriple(view: DataView, offset: number, le: boolean): number {
  const d = view.getUint32(offset, le);
  const m = view.getUint32(offset + 4, le);
  const s = view.getUint32(offset + 8, le);
  const dd = view.getUint32(offset + 12, le);
  const mm = view.getUint32(offset + 16, le);
  const ss = view.getUint32(offset + 20, le);
  return (d / dd) + (m / mm) / 60 + (s / ss) / 3600;
}

export function getBrowserGeo(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}
