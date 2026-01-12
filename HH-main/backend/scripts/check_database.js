/**
 * 检查数据库状态脚本
 * 用于检查当前数据库中的标签值是否符合规范
 */

const mongoose = require('mongoose');
require('dotenv').config();
const Post = require('../models/Post');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/offermagnet';

async function checkDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB 连接成功\n');

    const total = await Post.countDocuments({});
    console.log(`📊 当前数据库状态:`);
    console.log(`总帖子数: ${total}`);

    if (total === 0) {
      console.log('\n✅ 数据库为空，可以直接开始上传新数据');
      process.exit(0);
    }

    // 检查 category 值
    const categories = await Post.distinct('tagDimensions.category');
    console.log(`\n📋 category 值: ${JSON.stringify(categories, null, 2)}`);

    // 检查 recruitType 值
    const recruitTypes = await Post.distinct('tagDimensions.recruitType');
    console.log(`📋 recruitType 值: ${JSON.stringify(recruitTypes, null, 2)}`);

    // 检查是否有中文值
    const chineseCategories = await Post.countDocuments({
      'tagDimensions.category': { $in: ['算法', '研发', '产品', '设计', '数据', '基础设施'] }
    });
    const chineseRecruitTypes = await Post.countDocuments({
      'tagDimensions.recruitType': { $in: ['实习', '校招', '社招'] }
    });

    console.log(`\n⚠️  不符合规范的数据:`);
    console.log(`中文 category 数量: ${chineseCategories}`);
    console.log(`中文 recruitType 数量: ${chineseRecruitTypes}`);

    const standardCategories = ['SWE', 'Data', 'PM', 'Design', 'Infra', 'Other'];
    const nonStandardCategories = categories.filter(c => !standardCategories.includes(c));
    if (nonStandardCategories.length > 0) {
      console.log(`\n❌ 非标准 category 值: ${JSON.stringify(nonStandardCategories)}`);
    }

    const standardRecruitTypes = ['intern', 'newgrad', 'experienced'];
    const nonStandardRecruitTypes = recruitTypes.filter(r => r && !standardRecruitTypes.includes(r));
    if (nonStandardRecruitTypes.length > 0) {
      console.log(`❌ 非标准 recruitType 值: ${JSON.stringify(nonStandardRecruitTypes)}`);
    }

    if (chineseCategories === 0 && chineseRecruitTypes === 0 && nonStandardCategories.length === 0 && nonStandardRecruitTypes.length === 0) {
      console.log('\n✅ 所有数据都符合规范！');
    } else {
      console.log('\n⚠️  发现不符合规范的数据，建议清理后重新上传');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    process.exit(1);
  }
}

checkDatabase();

