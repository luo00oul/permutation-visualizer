(function () {
  "use strict";

  const DEFAULT_PERMUTATION = [2, 6, 4, 5, 8, 1, 7, 3];
  const LEXICON_PERMUTATIONS = [
    [1, 2, 3], [1, 3, 2], [2, 1, 3],
    [2, 3, 1], [3, 1, 2], [3, 2, 1]
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function formatNumber(value) {
    return Number(value).toLocaleString("zh-CN");
  }

  class PlaybackController {
    constructor(container, total, onChange) {
      this.container = container;
      this.total = Math.max(1, total);
      this.index = 0;
      this.onChange = onChange;
      this.timer = null;
      this.delay = 1700;
      this.renderControls();
      this.emit();
    }

    renderControls() {
      this.container.innerHTML = `
        <div class="control-group">
          <button class="control-button" data-action="reset" aria-label="重置">↺</button>
          <button class="control-button" data-action="previous" aria-label="上一步">←</button>
          <button class="control-button play" data-action="play">▶ 自动播放</button>
          <button class="control-button" data-action="next" aria-label="下一步">→</button>
        </div>
        <div class="progress-track" aria-hidden="true"><i></i></div>
        <label class="speed-control">慢 <input type="range" min="900" max="2600" step="100" value="1700" aria-label="播放速度"> 快</label>`;
      this.playButton = $("[data-action='play']", this.container);
      this.progress = $(".progress-track i", this.container);
      this.previousButton = $("[data-action='previous']", this.container);
      this.nextButton = $("[data-action='next']", this.container);

      this.container.addEventListener("click", (event) => {
        const action = event.target.closest("button")?.dataset.action;
        if (action === "reset") this.reset();
        if (action === "previous") this.previous();
        if (action === "next") this.next();
        if (action === "play") this.toggle();
      });
      $("input[type='range']", this.container).addEventListener("input", (event) => {
        this.delay = 3500 - Number(event.target.value);
        if (this.timer) { this.pause(); this.play(); }
      });
    }

    setTotal(total, reset = true) {
      this.pause();
      this.total = Math.max(1, total);
      if (reset) this.index = 0;
      else this.index = Math.min(this.index, this.total - 1);
      this.emit();
    }

    emit() {
      this.previousButton.disabled = this.index === 0;
      this.nextButton.disabled = this.index >= this.total - 1;
      const denominator = Math.max(1, this.total - 1);
      this.progress.style.width = `${(this.index / denominator) * 100}%`;
      this.onChange(this.index);
    }

    next() {
      if (this.index < this.total - 1) {
        this.index += 1;
        this.emit();
      } else {
        this.pause();
      }
    }

    previous() {
      this.pause();
      if (this.index > 0) { this.index -= 1; this.emit(); }
    }

    reset() {
      this.pause();
      this.index = 0;
      this.emit();
    }

    play() {
      if (this.index >= this.total - 1) this.index = 0;
      this.emit();
      this.timer = window.setInterval(() => this.next(), this.delay);
      this.playButton.textContent = "Ⅱ 暂停";
    }

    pause() {
      if (this.timer) window.clearInterval(this.timer);
      this.timer = null;
      if (this.playButton) this.playButton.textContent = "▶ 自动播放";
    }

    toggle() { this.timer ? this.pause() : this.play(); }
  }

  class NumberBoard {
    constructor(element) {
      this.element = element;
      this.nodes = new Map();
    }

    render(values, decorate) {
      const oldPositions = new Map();
      this.nodes.forEach((node, value) => {
        if (!values.includes(value)) { node.remove(); this.nodes.delete(value); return; }
        oldPositions.set(value, node.getBoundingClientRect());
        node.getAnimations().forEach((animation) => animation.cancel());
      });

      values.forEach((value, index) => {
        let node = this.nodes.get(value);
        if (!node) {
          node = document.createElement("div");
          node.className = "num-node";
          node.dataset.value = String(value);
          node.textContent = value;
          this.nodes.set(value, node);
        }
        node.className = "num-node";
        node.dataset.label = "";
        decorate(node, index, value);
        this.element.appendChild(node);
      });

      values.forEach((value) => {
        const node = this.nodes.get(value);
        const oldPosition = oldPositions.get(value);
        if (!oldPosition) return;
        const newPosition = node.getBoundingClientRect();
        const deltaX = oldPosition.left - newPosition.left;
        const deltaY = oldPosition.top - newPosition.top;
        if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !this.element.getClientRects().length) return;
        const restingTransform = getComputedStyle(node).transform;
        const rest = restingTransform === "none" ? "" : restingTransform;
        node.animate([
          { transform: `translate(${deltaX}px, ${deltaY}px) ${rest}`, offset: 0 },
          { transform: `translate(${deltaX * .54}px, ${deltaY - (deltaX > 0 ? 34 : -25)}px) ${rest}`, offset: .48 },
          { transform: `translate(0, -3px) ${rest}`, offset: .88 },
          { transform: rest || "none", offset: 1 }
        ], { duration: 640, easing: "cubic-bezier(.22,.68,.22,1)" });
      });
    }
  }

  let currentPermutation = [...DEFAULT_PERMUTATION];
  let rankSteps = window.PermutationRank.generateRankSteps(currentPermutation);
  let nextData = window.NextPermutation.generateNextSteps(currentPermutation);
  let activeView = "overview";

  const rankBoard = new NumberBoard($("#rank-board"));
  const nextBoard = new NumberBoard($("#next-board"));

  function renderLexicon(index) {
    const list = $("#lexicon-list");
    if (!list.children.length) {
      LEXICON_PERMUTATIONS.forEach((permutation, rowIndex) => {
        const row = document.createElement("div");
        row.className = "lexicon-row";
        row.innerHTML = `<span>${rowIndex}</span><div class="lexicon-perm">${permutation.map((value) => `<i>${value}</i>`).join("")}</div>`;
        list.appendChild(row);
      });
    }
    $$(".lexicon-row", list).forEach((row, rowIndex) => {
      row.classList.toggle("visible", rowIndex <= index);
      row.classList.toggle("current", rowIndex === index);
    });
  }

  function renderRank(index) {
    const step = rankSteps[index];
    rankBoard.render(step.array, (node, nodeIndex) => {
      if (nodeIndex === step.currentIndex) {
        node.classList.add("is-current");
        node.dataset.label = "当前";
      } else if (step.smallerIndices?.includes(nodeIndex)) {
        node.classList.add("is-smaller");
        node.dataset.label = "更小";
      }
      if (step.kind === "complete") node.classList.add("is-complete");
    });

    $("#rank-step-counter").textContent = `STEP ${index} / ${rankSteps.length - 1}`;
    $("#rank-kicker").textContent = step.kind === "complete" ? "RESULT" : step.kind === "start" ? "READY" : "COUNT × WEIGHT";
    $("#rank-step-title").textContent = step.title;
    $("#rank-description").textContent = step.description;
    $("#rank-total").textContent = formatNumber(step.rankAfter);
    $("#rank-accumulator").textContent = formatNumber(step.rankAfter);

    const equation = $("#rank-equation");
    if (step.row) {
      equation.innerHTML = `<span>${step.row.smaller}</span><b>×</b><span>${step.row.weightIndex}! (${step.row.weight})</span><b>=</b><strong>${step.row.contribution}</strong>`;
    } else {
      equation.innerHTML = "<span>smaller</span><b>×</b><span>factorial</span><b>=</b><strong>贡献</strong>";
    }

    const tableBody = $("#rank-table-body");
    if (!step.rows?.length) {
      tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">逐步运行后，这里会形成完整的计算轨迹</td></tr>';
      return;
    }
    tableBody.innerHTML = step.rows.map((row) => `<tr>
      <td>${row.position}</td><td>${row.value}</td><td>${row.smaller}</td>
      <td>${row.weightIndex}! = ${row.weight}</td><td>${row.contribution}</td><td>${row.rank}</td>
    </tr>`).join("");
    const tableViewport = tableBody.closest(".rank-table-wrap");
    tableViewport.scrollTop = tableViewport.scrollHeight;
  }

  function renderNext(index) {
    const step = nextData.steps[index];
    nextBoard.render(step.array, (node, nodeIndex) => {
      if (step.suffixStart !== undefined && nodeIndex >= step.suffixStart) node.classList.add("is-suffix");
      if (step.compareIndices?.includes(nodeIndex) || step.candidate === nodeIndex) node.classList.add("is-scan");
      if (step.pivot === nodeIndex) { node.classList.add("is-pivot"); node.dataset.label = "pivot"; }
      if (step.successor === nodeIndex) { node.classList.add("is-successor"); node.dataset.label = "successor"; }
      if (step.kind === "complete") node.classList.add("is-complete");
    });

    $("#next-step-counter").textContent = `STEP ${index} / ${nextData.steps.length - 1}`;
    $("#next-kicker").textContent = ["READY", "FIND PIVOT", "FIND + SWAP", "REVERSE", "RESULT"][step.phase] || "PROCESS";
    $("#next-step-title").textContent = step.title;
    $("#next-description").textContent = step.description;

    const phaseElements = $$("#phase-track span");
    phaseElements.forEach((element, phaseIndex) => element.classList.toggle("active", Math.max(0, step.phase - 1) === phaseIndex));
    const operations = $$("#operation-readout span");
    operations.forEach((element) => element.classList.remove("active"));
    if (step.phase <= 1) operations[0].classList.add("active");
    else if (step.phase === 2) (step.kind === "swap" ? operations[2] : operations[1]).classList.add("active");
    else if (step.phase === 3) operations[2].classList.add("active");

    const result = $("#next-result-value");
    if (step.kind === "complete") result.textContent = step.array.join(" ");
    else if (step.kind === "no-next") result.textContent = "不存在下一排列";
    else result.textContent = "—";
  }

  const lexiconController = new PlaybackController($("#lexicon-controls"), LEXICON_PERMUTATIONS.length, renderLexicon);
  const rankController = new PlaybackController($("#rank-controls"), rankSteps.length, renderRank);
  const nextController = new PlaybackController($("#next-controls"), nextData.steps.length, renderNext);
  const controllers = { lexicon: lexiconController, rank: rankController, next: nextController };

  function pauseAll(except) {
    Object.entries(controllers).forEach(([name, controller]) => {
      if (name !== except) controller.pause();
    });
  }

  function showView(name) {
    if (!$("#view-" + name)) return;
    activeView = name;
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${name}`));
    $$(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    pauseAll(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateOverview() {
    const rank = window.PermutationRank.calculateRank(currentPermutation);
    const next = window.NextPermutation.nextPermutation(currentPermutation);
    const maxRank = window.PermutationRank.factorials(currentPermutation.length)[currentPermutation.length] - 1;
    $("#current-permutation-label").textContent = currentPermutation.join(" ");
    $("#overview-n").textContent = currentPermutation.length;
    $("#overview-rank").textContent = rank;
    $("#overview-rank-large").textContent = formatNumber(rank);
    $("#overview-next").textContent = next ? next.join("") : "LAST";
    $("#overview-max-rank").textContent = maxRank;
    $("#overview-array").innerHTML = currentPermutation.map((value) => `<span>${value}</span>`).join("");
    $("#overview-array").style.setProperty("--count", currentPermutation.length);
    const percentage = maxRank ? (rank / maxRank) * 100 : 0;
    $(".scale-row div").style.background = `linear-gradient(90deg, var(--blue) ${percentage}%, var(--line) ${percentage}%)`;
  }

  function loadPermutation(permutation) {
    currentPermutation = [...permutation];
    rankSteps = window.PermutationRank.generateRankSteps(currentPermutation);
    nextData = window.NextPermutation.generateNextSteps(currentPermutation);
    rankController.setTotal(rankSteps.length);
    nextController.setTotal(nextData.steps.length);
    updateOverview();

    const rank = window.PermutationRank.calculateRank(currentPermutation);
    $("#playground-rank").textContent = rank;
    $("#playground-next").textContent = nextData.result ? nextData.result.join(" ") : "不存在下一排列";
    $("#n-input").value = currentPermutation.length;
    $("#permutation-input").value = currentPermutation.join(" ");
    $("#form-message").textContent = "";
  }

  function parsePermutation() {
    const n = Number($("#n-input").value);
    const raw = $("#permutation-input").value.trim();
    if (!Number.isInteger(n) || n < 3 || n > 10) return { error: "n 必须是 3 到 10 之间的整数。" };
    if (!raw) return { error: "请输入一个排列。" };
    const tokens = raw.split(/[\s,，]+/).filter(Boolean);
    if (tokens.some((token) => !/^\d+$/.test(token))) return { error: "排列中只能包含整数，并使用空格或逗号分隔。" };
    const values = tokens.map(Number);
    if (values.length !== n) return { error: `需要输入 ${n} 个数，当前输入了 ${values.length} 个。` };
    const invalid = values.find((value) => value < 1 || value > n);
    if (invalid !== undefined) return { error: `数字 ${invalid} 超出范围；每个数都应在 1 到 ${n} 之间。` };
    if (new Set(values).size !== values.length) return { error: "排列中存在重复元素。" };
    return { values };
  }

  function shuffledPermutation(n) {
    const values = Array.from({ length: n }, (_, index) => index + 1);
    for (let i = values.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }

  function resizePermutation() {
    const n = Number($("#n-input").value);
    if (!Number.isInteger(n) || n < 3 || n > 10) return;
    const values = currentPermutation.filter((value) => value <= n);
    for (let value = 1; value <= n; value += 1) {
      if (!values.includes(value)) values.push(value);
    }
    loadPermutation(values);
  }

  $$(".nav-item").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
  $$('[data-go]').forEach((button) => button.addEventListener("click", () => showView(button.dataset.go)));

  $("#playground-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const parsed = parsePermutation();
    if (parsed.error) {
      $("#form-message").textContent = parsed.error;
      return;
    }
    loadPermutation(parsed.values);
  });

  $("#random-button").addEventListener("click", () => {
    const n = Math.min(10, Math.max(3, Number($("#n-input").value) || 8));
    loadPermutation(shuffledPermutation(n));
  });

  $("#n-input").addEventListener("change", resizePermutation);
  $("#n-minus").addEventListener("click", () => {
    $("#n-input").value = Math.max(3, Number($("#n-input").value) - 1 || 3);
    resizePermutation();
  });
  $("#n-plus").addEventListener("click", () => {
    $("#n-input").value = Math.min(10, Number($("#n-input").value) + 1 || 3);
    resizePermutation();
  });

  $$("[data-sample]").forEach((button) => button.addEventListener("click", () => {
    const values = button.dataset.sample.split(" ").map(Number);
    loadPermutation(values);
  }));

  document.addEventListener("keydown", (event) => {
    const controller = controllers[activeView];
    if (!controller || event.target.matches("input")) return;
    if (event.key === "ArrowRight") { event.preventDefault(); controller.next(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); controller.previous(); }
    if (event.code === "Space") { event.preventDefault(); controller.toggle(); }
  });

  loadPermutation(DEFAULT_PERMUTATION);
  showView("overview");
}());
