// 使用数学模块
// 演示：如何导入和使用模块

const math = require('./math');

console.log('=== 数学运算演示 ===');
console.log('10 + 5 =', math.add(10, 5));
console.log('10 - 5 =', math.subtract(10, 5));
console.log('10 * 5 =', math.multiply(10, 5));
console.log('10 / 5 =', math.divide(10, 5));
console.log('10 / 0 =', math.divide(10, 0));  // 测试错误处理

console.log('\n=== 模块信息 ===');
console.log('math 模块：', math);
