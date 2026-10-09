(function () {
  "use strict";

  function factorials(n) {
    const values = [1];
    for (let i = 1; i <= n; i += 1) values[i] = values[i - 1] * i;
    return values;
  }

  function generateRankSteps(permutation) {
    const n = permutation.length;
    const factorial = factorials(n);
    let rank = 0;
    const steps = [{
      kind: "start",
      array: [...permutation],
      title: "准备计算",
      description: "从左到右考察每个位置，统计它右侧更小的元素。",
      rankBefore: 0,
      rankAfter: 0,
      rows: []
    }];

    for (let i = 0; i < n; i += 1) {
      const smallerIndices = [];
      for (let j = i + 1; j < n; j += 1) {
        if (permutation[j] < permutation[i]) smallerIndices.push(j);
      }
      const smaller = smallerIndices.length;
      const weightIndex = n - i - 1;
      const contribution = smaller * factorial[weightIndex];
      const rankBefore = rank;
      rank += contribution;
      const row = {
        position: i + 1,
        value: permutation[i],
        smaller,
        smallerValues: smallerIndices.map((index) => permutation[index]),
        weightIndex,
        weight: factorial[weightIndex],
        contribution,
        rank
      };
      steps.push({
        kind: i === n - 1 ? "complete" : "calculate",
        array: [...permutation],
        currentIndex: i,
        smallerIndices,
        title: i === n - 1 ? "计算完成" : `考察第 ${i + 1} 位`,
        description: smaller
          ? `${permutation[i]} 的右侧有 ${smaller} 个更小元素：${row.smallerValues.join("、")}`
          : `${permutation[i]} 的右侧没有更小的元素`,
        rankBefore,
        rankAfter: rank,
        row,
        rows: steps.filter((step) => step.row).map((step) => step.row).concat(row)
      });
    }
    return steps;
  }

  function calculateRank(permutation) {
    const steps = generateRankSteps(permutation);
    return steps[steps.length - 1].rankAfter;
  }

  window.PermutationRank = { factorials, generateRankSteps, calculateRank };
}());
