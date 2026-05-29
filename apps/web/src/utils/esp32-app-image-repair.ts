const ESP_IMAGE_MAGIC = 0xe9;
const ESP_CHECKSUM_MAGIC = 0xef;
const EXTENDED_HEADER_SIZE = 16;
const COMMON_HEADER_SIZE = 8;
const SEGMENT_HEADER_SIZE = 8;
const SHA256_DIGEST_LEN = 32;

function xorChecksum(data: Uint8Array, state = ESP_CHECKSUM_MAGIC): number {
  let next = state;
  for (let i = 0; i < data.length; i++) {
    next ^= data[i]!;
  }
  return next;
}

/** ESP32 / ESP32-S3 app images append a SHA256 over the image (before the digest). */
function hasAppendedDigest(image: Uint8Array): boolean {
  if (image.length < COMMON_HEADER_SIZE + EXTENDED_HEADER_SIZE) {
    return false;
  }
  return image[COMMON_HEADER_SIZE + EXTENDED_HEADER_SIZE - 1] === 1;
}

/**
 * After patching JSON into an ESP32-class .bin, refresh the ROM checksum byte
 * and trailing SHA256 so the 2nd-stage bootloader accepts the app.
 */
export async function repairEsp32AppImageAfterPatch(image: Uint8Array): Promise<Uint8Array> {
  if (image[0] !== ESP_IMAGE_MAGIC || !hasAppendedDigest(image)) {
    return image;
  }
  if (image.length <= SHA256_DIGEST_LEN + 1) {
    return image;
  }

  const segmentCount = image[1]!;
  let offset = COMMON_HEADER_SIZE + EXTENDED_HEADER_SIZE;
  let checksum = ESP_CHECKSUM_MAGIC;

  for (let i = 0; i < segmentCount; i++) {
    if (offset + SEGMENT_HEADER_SIZE > image.length) {
      throw new Error("Invalid ESP32 firmware image: truncated segment header");
    }
    const view = new DataView(image.buffer, image.byteOffset + offset, SEGMENT_HEADER_SIZE);
    const dataLength = view.getUint32(4, true);
    offset += SEGMENT_HEADER_SIZE;
    if (offset + dataLength > image.length - SHA256_DIGEST_LEN) {
      throw new Error("Invalid ESP32 firmware image: truncated segment data");
    }
    checksum = xorChecksum(image.subarray(offset, offset + dataLength), checksum);
    offset += dataLength;
  }

  const imageLength = image.length - SHA256_DIGEST_LEN;
  const checksumPos = imageLength - 1;
  const out = new Uint8Array(image);
  out[checksumPos] = checksum;

  const digestInput = out.buffer.slice(out.byteOffset, out.byteOffset + imageLength);
  const digest = await crypto.subtle.digest("SHA-256", digestInput);
  out.set(new Uint8Array(digest), imageLength);
  return out;
}
