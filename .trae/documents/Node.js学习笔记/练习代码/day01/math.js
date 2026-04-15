// 数学工具模块
// 演示：如何定义和导出模块

// 加法
function add(a, b) {
  return a + b;
}

// 减法
function subtract(a, b) {
  return a - b;
}

// 乘法
function multiply(a, b) {
  return a * b;
}

// 除法（注意除数为0的情况）
function divide(a, b) {
  if (b === 0) {
    return '错误：除数不能为0';
  }
  return a / b;
}

// 导出模块（让别人可以使用这些函数）
module.exports = {
  add,
  subtract,
  multiply,
  divide
};
