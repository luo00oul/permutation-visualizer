(function () {
  "use strict";

  function generateNextSteps(permutation) {
    const array = [...permutation];
    const steps = [{
      kind: "start",
      phase: 0,
      array: [...array],
      title: "准备寻找下一排列",
      description: "先从最右侧开始，寻找第一个还能增大的位置。"
    }];

    let pivot = array.length - 2;
    while (pivot >= 0 && array[pivot] >= array[pivot + 1]) {
      steps.push({
        kind: "scan-pivot",
        phase: 1,
        array: [...array],
        compareIndices: [pivot, pivot + 1],
        suffixStart: pivot + 1,
        title: `比较 ${array[pivot]} 与 ${array[pivot + 1]}`,
        description: `${array[pivot]} ≥ ${array[pivot + 1]}，这里不能作为 pivot，继续向左。`
      });
      pivot -= 1;
    }

    if (pivot < 0) {
      steps.push({
        kind: "no-next",
        phase: 4,
        array: [...array],
        suffixStart: 0,
        title: "不存在下一排列",
        description: "整个排列已经降序排列，它就是字典序中的最后一个排列。"
      });
      return { steps, result: null };
    }

    steps.push({
      kind: "pivot-found",
      phase: 1,
      array: [...array],
      pivot,
      suffixStart: pivot + 1,
      title: `找到 pivot：${array[pivot]}`,
      description: `右侧后缀 ${array.slice(pivot + 1).join(" ")} 已经降序；要得到更大的排列，必须改变 pivot。`
    });

    let successor = array.length - 1;
    while (array[successor] <= array[pivot]) {
      steps.push({
        kind: "scan-successor",
        phase: 2,
        array: [...array],
        pivot,
        candidate: successor,
        suffixStart: pivot + 1,
        title: `检查候选 ${array[successor]}`,
        description: `${array[successor]} 不大于 pivot ${array[pivot]}，继续向左寻找。`
      });
      successor -= 1;
    }

    steps.push({
      kind: "successor-found",
      phase: 2,
      array: [...array],
      pivot,
      successor,
      suffixStart: pivot + 1,
      title: `找到 successor：${array[successor]}`,
      description: `它是后缀中比 ${array[pivot]} 大、但尽可能小的元素。`
    });

    const beforeSwap = [...array];
    [array[pivot], array[successor]] = [array[successor], array[pivot]];
    steps.push({
      kind: "swap",
      phase: 2,
      array: [...array],
      pivot,
      successor,
      movedValues: [beforeSwap[pivot], beforeSwap[successor]],
      suffixStart: pivot + 1,
      title: `交换 ${beforeSwap[pivot]} 与 ${beforeSwap[successor]}`,
      description: `前缀刚刚变大：${array.slice(0, pivot + 1).join(" ")}。现在让后缀尽可能小。`
    });

    const beforeReverse = [...array];
    const reversed = array.slice(pivot + 1).reverse();
    array.splice(pivot + 1, reversed.length, ...reversed);
    steps.push({
      kind: "reverse",
      phase: 3,
      array: [...array],
      pivot,
      suffixStart: pivot + 1,
      movedValues: beforeReverse.slice(pivot + 1),
      title: "反转右侧后缀",
      description: `${beforeReverse.slice(pivot + 1).join(" ")} → ${array.slice(pivot + 1).join(" ")}，得到最小可行后缀。`
    });

    steps.push({
      kind: "complete",
      phase: 4,
      array: [...array],
      pivot,
      suffixStart: pivot + 1,
      title: "下一排列已找到",
      description: array.join(" ")
    });

    return { steps, result: [...array] };
  }

  function nextPermutation(permutation) {
    return generateNextSteps(permutation).result;
  }

  window.NextPermutation = { generateNextSteps, nextPermutation };
}());
