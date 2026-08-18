// bun shim: @nestjs/mapped-types 引用 class-transformer/storage
// 直接导入 class-transformer 内部模块而非子路径
const { MetadataStorage } = require('class-transformer/cjs/MetadataStorage');
const defaultMetadataStorage = new MetadataStorage();
module.exports = { defaultMetadataStorage };
