/**
 * 标签验证自动化测试 - Node.js 版本
 * 确保后端验证逻辑与 Python 版本一致，前后端值匹配
 */

const TagValidator = require('../utils/tagValidator');

function testNormalizeCategory() {
  console.log('🧪 测试 category 规范化...');
  
  const testCases = [
    ['算法', 'Data'],
    ['数据', 'Data'],
    ['数据科学', 'Data'],
    ['研发', 'SWE'],
    ['软件工程', 'SWE'],
    ['产品', 'PM'],
    ['设计', 'Design'],
    ['基础设施', 'Infra'],
    ['SWE', 'SWE'],  // 已经是标准值
    ['Data', 'Data'],  // 已经是标准值
    ['Other', 'Other']  // 已经是标准值
  ];
  
  const validator = new TagValidator();
  let passed = 0;
  let failed = 0;
  
  for (const [inputValue, expected] of testCases) {
    const result = validator.normalizeValue('category', inputValue);
    if (result === expected) {
      console.log(`  ✅ '${inputValue}' → '${result}'`);
      passed++;
    } else {
      console.log(`  ❌ '${inputValue}' → '${result}' (期望: '${expected}')`);
      failed++;
    }
  }
  
  console.log(`\n结果: ${passed} 通过, ${failed} 失败\n`);
  return failed === 0;
}

function testNormalizeRecruitType() {
  console.log('🧪 测试 recruitType 规范化...');
  
  const testCases = [
    ['实习', 'intern'],
    ['校招', 'newgrad'],
    ['社招', 'experienced'],
    ['intern', 'intern'],  // 已经是标准值
    ['newgrad', 'newgrad'],  // 已经是标准值
    ['experienced', 'experienced']  // 已经是标准值
  ];
  
  const validator = new TagValidator();
  let passed = 0;
  let failed = 0;
  
  for (const [inputValue, expected] of testCases) {
    const result = validator.normalizeValue('recruitType', inputValue);
    if (result === expected) {
      console.log(`  ✅ '${inputValue}' → '${result}'`);
      passed++;
    } else {
      console.log(`  ❌ '${inputValue}' → '${result}' (期望: '${expected}')`);
      failed++;
    }
  }
  
  console.log(`\n结果: ${passed} 通过, ${failed} 失败\n`);
  return failed === 0;
}

function testValidateTagDimensions() {
  console.log('🧪 测试 tagDimensions 验证...');
  
  const validator = new TagValidator();
  let passed = 0;
  let failed = 0;
  
  // 测试用例 1: 有效的 tagDimensions
  const validTagDims = {
    category: 'Data',
    recruitType: 'intern',
    location: 'San Francisco Bay Area',
    experience: '0-2',
    salary: '100k-150k',
    technologies: ['Python', 'React'],
    custom: ['算法题', '系统设计']
  };
  const result1 = validator.validateTagDimensions(validTagDims);
  if (result1.valid && result1.errors.length === 0) {
    console.log('  ✅ 有效 tagDimensions 通过验证');
    passed++;
  } else {
    console.log(`  ❌ 有效 tagDimensions 验证失败: ${result1.errors.join(', ')}`);
    failed++;
  }
  
  // 测试用例 2: 无效的 category（中文值）
  const invalidTagDims = {
    category: '算法',  // 应该规范化
    recruitType: 'intern',
    location: '',
    experience: '',
    salary: '',
    technologies: [],
    custom: []
  };
  const result2 = validator.validateTagDimensions(invalidTagDims);
  if (!result2.valid) {
    console.log(`  ✅ 无效 category 正确被拒绝: ${result2.errors[0] || 'N/A'}`);
    passed++;
  } else {
    console.log('  ❌ 无效 category 应该被拒绝');
    failed++;
  }
  
  // 测试用例 3: 缺少必需字段
  const missingCategory = {
    recruitType: 'intern',
    location: '',
    experience: '',
    salary: '',
    technologies: [],
    custom: []
  };
  const result3 = validator.validateTagDimensions(missingCategory);
  if (!result3.valid) {
    console.log(`  ✅ 缺少 category 正确被拒绝: ${result3.errors[0] || 'N/A'}`);
    passed++;
  } else {
    console.log('  ❌ 缺少 category 应该被拒绝');
    failed++;
  }
  
  console.log(`\n结果: ${passed} 通过, ${failed} 失败\n`);
  return failed === 0;
}

function testValidateAndNormalizePost() {
  console.log('🧪 测试 Post 对象验证和规范化...');
  
  const validator = new TagValidator();
  let passed = 0;
  let failed = 0;
  
  // 测试用例: 包含中文 category 的 Post
  const postWithChineseCategory = {
    title: 'Google 数据科学岗位面试经验',
    company: 'Google',
    role: 'Data Scientist',
    tagDimensions: {
      category: '算法',  // 中文值，应该规范化
      recruitType: '校招',  // 中文值，应该规范化
      location: 'San Francisco Bay Area',
      experience: '',
      salary: '',
      technologies: ['Python'],
      custom: []
    }
  };
  
  const result = validator.validateAndNormalizePost(postWithChineseCategory);
  
  if (result.valid) {
    // 检查是否已规范化
    if (result.post.tagDimensions.category === 'Data' &&
        result.post.tagDimensions.recruitType === 'newgrad') {
      console.log(`  ✅ Post 验证通过，已规范化: category=${result.post.tagDimensions.category}, recruitType=${result.post.tagDimensions.recruitType}`);
      passed++;
    } else {
      console.log(`  ❌ Post 验证通过，但未正确规范化: category=${result.post.tagDimensions.category}, recruitType=${result.post.tagDimensions.recruitType}`);
      failed++;
    }
  } else {
    console.log(`  ❌ Post 验证失败: ${result.errors.join(', ')}`);
    failed++;
  }
  
  console.log(`\n结果: ${passed} 通过, ${failed} 失败\n`);
  return failed === 0;
}

function runAllTests() {
  console.log('='.repeat(60));
  console.log('🚀 开始运行标签验证自动化测试');
  console.log('='.repeat(60));
  console.log();
  
  const results = [];
  results.push(['category 规范化', testNormalizeCategory()]);
  results.push(['recruitType 规范化', testNormalizeRecruitType()]);
  results.push(['tagDimensions 验证', testValidateTagDimensions()]);
  results.push(['Post 对象验证和规范化', testValidateAndNormalizePost()]);
  
  console.log('='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  
  const passedCount = results.filter(([, result]) => result).length;
  const totalCount = results.length;
  
  for (const [testName, result] of results) {
    const status = result ? '✅ 通过' : '❌ 失败';
    console.log(`${status} - ${testName}`);
  }
  
  console.log();
  console.log(`总计: ${passedCount}/${totalCount} 通过`);
  console.log('='.repeat(60));
  
  if (passedCount === totalCount) {
    console.log('✅ 所有测试通过！');
    return 0;
  } else {
    console.log('❌ 部分测试失败！');
    return 1;
  }
}

if (require.main === module) {
  const exitCode = runAllTests();
  process.exit(exitCode);
}

module.exports = {
  testNormalizeCategory,
  testNormalizeRecruitType,
  testValidateTagDimensions,
  testValidateAndNormalizePost,
  runAllTests
};

