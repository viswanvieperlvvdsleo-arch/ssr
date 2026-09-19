// Pure Node.js Agora AccessToken2 (007) Token Generator
// No external npm dependencies required (uses built-in crypto and zlib)

import crypto from 'node:crypto';
import zlib from 'node:zlib';

const VERSION_LENGTH = 3;
const getVersion = () => '007';

const isUuid = (value) => {
  return value != null && typeof value !== 'undefined' && /^[0-9a-fA-F]{32}$/.test(value.toString());
};

const encodeHMac = (key, message) => {
  return crypto.createHmac('sha256', key).update(message).digest();
};

function ByteBuf() {
  const that = {
    buffer: Buffer.alloc(1024),
    position: 0,
  };
  that.buffer.fill(0);

  const ensureCapacity = (additionalLength) => {
    const requiredLength = that.position + additionalLength;
    if (requiredLength <= that.buffer.length) return;
    let capacity = that.buffer.length;
    while (capacity < requiredLength) {
      capacity *= 2;
    }
    const expanded = Buffer.alloc(capacity);
    that.buffer.copy(expanded, 0, 0, that.position);
    that.buffer = expanded;
  };

  that.pack = () => {
    const out = Buffer.alloc(that.position);
    that.buffer.copy(out, 0, 0, out.length);
    return out;
  };

  that.putUint16 = (v) => {
    ensureCapacity(2);
    that.buffer.writeUInt16LE(v, that.position);
    that.position += 2;
    return that;
  };

  that.putUint32 = (v) => {
    ensureCapacity(4);
    that.buffer.writeUInt32LE(v, that.position);
    that.position += 4;
    return that;
  };

  that.putInt32 = (v) => {
    ensureCapacity(4);
    that.buffer.writeInt32LE(v, that.position);
    that.position += 4;
    return that;
  };

  that.putInt16 = (v) => {
    ensureCapacity(2);
    that.buffer.writeInt16LE(v, that.position);
    that.position += 2;
    return that;
  };

  that.putBytes = (bytes) => {
    that.putUint16(bytes.length);
    ensureCapacity(bytes.length);
    bytes.copy(that.buffer, that.position);
    that.position += bytes.length;
    return that;
  };

  that.putString = (str) => {
    return that.putBytes(Buffer.from(str || ''));
  };

  that.putTreeMapUint32 = (map) => {
    if (!map) {
      that.putUint16(0);
      return that;
    }
    const keys = Object.keys(map);
    that.putUint16(keys.length);
    for (const key of keys) {
      that.putUint16(Number(key));
      that.putUint32(Number(map[key]));
    }
    return that;
  };

  return that;
}

class Service {
  constructor(service_type) {
    this.__type = service_type;
    this.__privileges = {};
  }

  __pack_type() {
    const buf = ByteBuf();
    buf.putUint16(this.__type);
    return buf.pack();
  }

  __pack_privileges() {
    const buf = ByteBuf();
    buf.putTreeMapUint32(this.__privileges);
    return buf.pack();
  }

  service_type() {
    return this.__type;
  }

  add_privilege(privilege, expire) {
    this.__privileges[privilege] = expire;
  }

  pack() {
    return Buffer.concat([this.__pack_type(), this.__pack_privileges()]);
  }
}

const kRtcServiceType = 1;

class ServiceRtc extends Service {
  constructor(channel_name, uid) {
    super(kRtcServiceType);
    this.__channel_name = channel_name;
    this.__uid = uid === 0 || uid === '0' || !uid ? '' : `${uid}`;
  }

  pack() {
    const buffer = ByteBuf();
    buffer.putString(this.__channel_name).putString(this.__uid);
    return Buffer.concat([super.pack(), buffer.pack()]);
  }
}

ServiceRtc.kPrivilegeJoinChannel = 1;
ServiceRtc.kPrivilegePublishAudioStream = 2;
ServiceRtc.kPrivilegePublishVideoStream = 3;
ServiceRtc.kPrivilegePublishDataStream = 4;

class AccessToken2 {
  constructor(appId, appCertificate, issueTs, expire) {
    this.appId = appId;
    this.appCertificate = appCertificate;
    this.issueTs = issueTs || Math.floor(Date.now() / 1000);
    this.expire = expire || 3600;
    this.salt = Math.floor(Math.random() * 99999999) + 1;
    this.services = [];
  }

  __signing() {
    const tsBuf = ByteBuf();
    tsBuf.putUint32(this.issueTs);
    // Official Agora order: encodeHMac(key=issueTs_bytes, message=appCertificate)
    let signing = encodeHMac(tsBuf.pack(), this.appCertificate);

    const saltBuf = ByteBuf();
    saltBuf.putUint32(this.salt);
    // Official Agora order: encodeHMac(key=salt_bytes, message=signing)
    signing = encodeHMac(saltBuf.pack(), signing);
    return signing;
  }

  __build_check() {
    if (!isUuid(this.appId) || !isUuid(this.appCertificate)) {
      return false;
    }
    if (this.services.length === 0) {
      return false;
    }
    return true;
  }

  add_service(service) {
    this.services.push(service);
  }

  build() {
    if (!this.__build_check()) {
      return '';
    }

    const signing = this.__signing();
    let signing_info = ByteBuf()
      .putString(this.appId)
      .putUint32(this.issueTs)
      .putUint32(this.expire)
      .putUint32(this.salt)
      .putUint16(this.services.length)
      .pack();

    for (const service of this.services) {
      signing_info = Buffer.concat([signing_info, service.pack()]);
    }

    const signature = encodeHMac(signing, signing_info);
    const content = Buffer.concat([ByteBuf().putString(signature).pack(), signing_info]);
    const compressed = zlib.deflateSync(content);
    return `${getVersion()}${Buffer.from(compressed).toString('base64')}`;
  }
}

/**
 * Generate Agora RTC Token
 * @param {Object} options
 * @param {string} [options.appId] Agora App ID
 * @param {string} [options.appCertificate] Agora App Certificate
 * @param {string} options.channelName Channel name
 * @param {string|number} [options.uid] User ID (0 or empty string for wildcard)
 * @param {number} [options.expireSeconds] Token validity in seconds (default 3600)
 * @returns {string} RTC Token
 */
function generateAgoraRtcToken({
  appId = process.env.NEXT_PUBLIC_AGORA_APP_ID || 'bf0878574a024609ba7d798f24065d6e',
  appCertificate = process.env.AGORA_APP_CERTIFICATE || '96d457f787064af18dc5b37e29f3c1ed',
  channelName,
  uid = 0,
  expireSeconds = 3600,
}) {
  if (!appId || !appCertificate || !channelName) {
    return '';
  }

  const issueTs = Math.floor(Date.now() / 1000);
  const expire = expireSeconds;
  const token = new AccessToken2(appId, appCertificate, issueTs, expire);

  const serviceRtc = new ServiceRtc(channelName, uid);
  serviceRtc.add_privilege(ServiceRtc.kPrivilegeJoinChannel, expire);
  serviceRtc.add_privilege(ServiceRtc.kPrivilegePublishAudioStream, expire);
  serviceRtc.add_privilege(ServiceRtc.kPrivilegePublishVideoStream, expire);
  serviceRtc.add_privilege(ServiceRtc.kPrivilegePublishDataStream, expire);

  token.add_service(serviceRtc);
  return token.build();
}

export {
  AccessToken2,
  ServiceRtc,
  generateAgoraRtcToken,
};

export default generateAgoraRtcToken;
