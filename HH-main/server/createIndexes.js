/**
 * 创建数据库索引脚本
 * 
 * 使用方法：
 * 1. 确保 MongoDB 正在运行
 * 2. 确保已连接到正确的数据库
 * 3. 运行: node createIndexes.js
 */

const mongoose = require('mongoose');
const Post = require('./models/Post');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/offermagnet';

async function createIndexes() {
  try {
    console.log('🔄 连接 MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB 连接成功');

    const db = mongoose.connection.db;
    const collection = db.collection('posts');

    console.log('\n📊 开始创建索引...\n');

    // 1. 时间索引（排序用）
    console.log('1. 创建 createdAt 索引...');
    await collection.createIndex({ createdAt: -1 });
    console.log('   ✅ createdAt: -1');

    // 2. 公司索引
    console.log('2. 创建 company 索引...');
    await collection.createIndex({ company: 1 });
    console.log('   ✅ company: 1');

    // 3. tagDimensions 索引
    console.log('3. 创建 tagDimensions 相关索引...');
    await collection.createIndex({ 'tagDimensions.location': 1 });
    console.log('   ✅ tagDimensions.location: 1');
    
    await collection.createIndex({ 'tagDimensions.recruitType': 1 });
    console.log('   ✅ tagDimensions.recruitType: 1');
    
    await collection.createIndex({ 'tagDimensions.category': 1 });
    console.log('   ✅ tagDimensions.category: 1');
    
    await collection.createIndex({ 'tagDimensions.experience': 1 });
    console.log('   ✅ tagDimensions.experience: 1');
    
    await collection.createIndex({ 'tagDimensions.salary': 1 });
    console.log('   ✅ tagDimensions.salary: 1');
    
    await collection.createIndex({ 'tagDimensions.technologies': 1 });
    console.log('   ✅ tagDimensions.technologies: 1');

    // 4. 复合索引（常见查询组合）
    console.log('4. 创建复合索引...');
    await collection.createIndex({ company: 1, createdAt: -1 });
    console.log('   ✅ company + createdAt');
    
    await collection.createIndex({ 'tagDimensions.location': 1, createdAt: -1 });
    console.log('   ✅ tagDimensions.location + createdAt');
    
    await collection.createIndex({ 'tagDimensions.category': 1, createdAt: -1 });
    console.log('   ✅ tagDimensions.category + createdAt');

    // 5. 显示所有索引
    console.log('\n📋 当前所有索引:');
    const indexes = await collection.indexes();
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n✅ 所有索引创建完成！');
    
    // 6. 分析查询性能（可选）
    console.log('\n🔍 测试查询性能...');
    const explainResult = await collection.find({}).sort({ createdAt: -1 }).limit(20).explain('executionStats');
    const executionTime = explainResult.executionStats.executionTimeMillis;
    console.log(`   查询耗时: ${executionTime}ms`);
    console.log(`   扫描文档数: ${explainResult.executionStats.totalDocsExamined}`);
    console.log(`   返回文档数: ${explainResult.executionStats.nReturned}`);
    
    if (executionTime > 100) {
      console.log('   ⚠️  查询仍然较慢，可能需要进一步优化');
    } else {
      console.log('   ✅ 查询性能正常');
    }

  } catch (error) {
    console.error('❌ 创建索引失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 数据库连接已关闭');
    process.exit(0);
  }
}

// 运行脚本
createIndexes();

