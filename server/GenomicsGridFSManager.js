// extensions/genome-central-redux/server/GenomicsGridFSManager.js
//
// GridFS bucket management for raw genomics files (23andMe txt exports).
// Mirrors pdf-parser's PdfGridFSManager with bucket name 'genomics'. The
// bucket is registered in the host's AUX_GRIDFS_BUCKETS so importRuns
// census/flush cover it via metadata.importRunId. FASTQ files never come
// through here — they are reference-only (see methods.genomics.js).

import { Meteor } from 'meteor/meteor';

const MongoInternals = Package['mongo'].MongoInternals;
const { GridFSBucket, ObjectId } = MongoInternals.NpmModules.mongodb.module;

// Node core crypto via the established real-require pattern
const nodeCrypto = (typeof Npm !== 'undefined' && Npm && typeof Npm.require === 'function')
  ? Npm.require('crypto')
  : require('crypto');

let _bucket = null;
let _initialized = false;

const BUCKET_NAME = 'genomics';
const CHUNK_SIZE = 255 * 1024; // 255 KB

const GenomicsGridFSManager = {
  initialize() {
    try {
      const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;
      if (!db) {
        console.error('[GenomicsGridFSManager] Could not access MongoDB database object');
        return false;
      }
      _bucket = new GridFSBucket(db, {
        bucketName: BUCKET_NAME,
        chunkSizeBytes: CHUNK_SIZE
      });
      _initialized = true;
      console.log('[GenomicsGridFSManager] Initialized: bucket="' + BUCKET_NAME + '", chunkSize=' + CHUNK_SIZE + ' bytes');
      return true;
    } catch (error) {
      console.error('[GenomicsGridFSManager] Initialization failed:', error.message);
      return false;
    }
  },

  isInitialized() {
    return _initialized && _bucket !== null;
  },

  /**
   * Upload a Buffer directly to GridFS. sha256 computed here so every upload
   * gets it (duplicate detection + integrity).
   * @returns {Promise<string>} the GridFS file _id as string
   */
  async uploadBuffer(buffer, filename, metadata) {
    if (!this.isInitialized()) {
      throw new Meteor.Error('gridfs-not-initialized', 'Genomics GridFS is not initialized');
    }
    const sha256 = nodeCrypto.createHash('sha256').update(buffer).digest('hex');
    return new Promise(function(resolve, reject) {
      const uploadStream = _bucket.openUploadStream(filename, {
        chunkSizeBytes: CHUNK_SIZE,
        metadata: Object.assign({}, metadata || {}, {
          uploadedAt: new Date().toISOString(),
          sha256: sha256,
          originalFilename: filename,
          size: buffer.length
        })
      });
      uploadStream.on('finish', function() {
        console.log('[GenomicsGridFSManager] Uploaded file:', filename, 'id:', uploadStream.id.toString());
        resolve(uploadStream.id.toString());
      });
      uploadStream.on('error', function(error) {
        console.error('[GenomicsGridFSManager] Upload error:', error.message);
        reject(error);
      });
      uploadStream.end(buffer);
    });
  },

  openDownloadStream(fileId, options) {
    if (!this.isInitialized()) {
      throw new Meteor.Error('gridfs-not-initialized', 'Genomics GridFS is not initialized');
    }
    return _bucket.openDownloadStream(new ObjectId(fileId), options || {});
  },

  /**
   * Read a stored file fully into a Buffer (raw 23andMe txt ≈ 15 MB — fine
   * to hold in memory; FASTQ never comes through this bucket).
   */
  async downloadToBuffer(fileId) {
    if (!this.isInitialized()) {
      throw new Meteor.Error('gridfs-not-initialized', 'Genomics GridFS is not initialized');
    }
    return new Promise(function(resolve, reject) {
      const chunks = [];
      const downloadStream = _bucket.openDownloadStream(new ObjectId(fileId));
      downloadStream.on('data', function(chunk) { chunks.push(chunk); });
      downloadStream.on('end', function() { resolve(Buffer.concat(chunks)); });
      downloadStream.on('error', function(error) {
        console.error('[GenomicsGridFSManager] downloadToBuffer error:', error.message);
        reject(error);
      });
    });
  },

  /**
   * Latest stored raw file for a patient. patientIds carries the aliases of
   * ONE patient (Mongo _id + FHIR id) — metadata.patientId was stamped with
   * whichever alias the upload used. Returns the files-collection doc or null.
   */
  async findLatestFileForPatient(patientIds) {
    if (!this.isInitialized()) {
      return null;
    }
    const ids = (patientIds || []).filter(Boolean);
    if (!ids.length) {
      return null;
    }
    const files = await _bucket.find({ 'metadata.patientId': { $in: ids } })
      .sort({ uploadDate: -1 })
      .limit(1)
      .toArray();
    return files.length > 0 ? files[0] : null;
  },

  async deleteFile(fileId) {
    if (!this.isInitialized()) {
      return false;
    }
    try {
      await _bucket.delete(new ObjectId(fileId));
      console.log('[GenomicsGridFSManager] Deleted file:', fileId);
      return true;
    } catch (error) {
      console.error('[GenomicsGridFSManager] deleteFile error:', error.message);
      return false;
    }
  }
};

export default GenomicsGridFSManager;
