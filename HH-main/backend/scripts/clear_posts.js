/**
 * 清理 posts 数据脚本
 * 谨慎使用：会删除所有 posts 数据
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Post = require('../models/Post');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/offermagnet';

async function clearPosts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB 连接成功\n');

    const total = await Post.countDocuments({});
    console.log(`📊 当前数据库状态:`);
    console.log(`总帖子数: ${total}\n`);

    if (total === 0) {
      console.log('✅ 数据库已经为空，无需清理');
      process.exit(0);
    }

    console.log(`⚠️  警告：即将删除 ${total} 条 posts 数据！`);
    console.log('   这将是不可逆的操作。\n');

    // 执行删除
    const result = await Post.deleteMany({});
    console.log(`✅ 成功删除 ${result.deletedCount} 条数据\n`);

    // 验证删除结果
    const remaining = await Post.countDocuments({});
    if (remaining === 0) {
      console.log('✅ 数据库已清空，可以开始上传新数据');
    } else {
      console.log(`⚠️  仍有 ${remaining} 条数据未删除`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

clearPosts();

