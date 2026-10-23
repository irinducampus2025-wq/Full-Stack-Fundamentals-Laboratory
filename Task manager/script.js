(function () {
  'use strict';

  var form        = document.getElementById('taskForm');
  var input       = document.getElementById('taskInput');
  var errorBox    = document.getElementById('taskError');
  var listEl      = document.getElementById('taskList');
  var counterEl   = document.getElementById('taskCounter');
  var clearBtn    = document.getElementById('clearBtn');
  var filterBtns  = document.querySelectorAll('.btn-filter');
  var emptyState  = document.getElementById('emptyState');
  var emptyTitle  = document.getElementById('emptyTitle');
  var emptyText   = document.getElementById('emptyText');
  var progressBar = document.getElementById('progressBar');
  var progressTrk = document.getElementById('progressTrack');
  var progressTxt = document.getElementById('progressText');
  var dateEl      = document.getElementById('todayDate');

  var STORAGE_KEY = 'tasklane.tasks.v1';
  var MAX_LENGTH  = 80;
  var tasks       = loadTasks();
  var filter      = 'all';

  function loadTasks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (t) {
        return t && typeof t.id === 'string' &&
               typeof t.text === 'string' &&
               typeof t.completed === 'boolean';
      });
    } catch (err) {
      return [];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
    }
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function activeCount() {
    return tasks.filter(function (t) { return !t.completed; }).length;
  }

  function showError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
    input.classList.add('is-invalid');
    input.setAttribute('aria-invalid', 'true');
    input.parentElement.classList.remove('shake');
    void input.parentElement.offsetWidth;
    input.parentElement.classList.add('shake');
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
    input.classList.remove('is-invalid');
    input.removeAttribute('aria-invalid');
  }

  function addTask(rawText) {
    var text = rawText.trim();

    if (text === '') {
      showError('Please type a task before adding it.');
      input.focus();
      return;
    }
    if (text.length > MAX_LENGTH) {
      showError('Tasks can be at most ' + MAX_LENGTH + ' characters long.');
      return;
    }

    var task = { id: makeId(), text: text, completed: false };
    tasks.push(task);
    saveTasks();

    clearError();
    input.value = '';
    input.focus();

    if (filter === 'completed') setFilter('all');
    render(task.id);
  }

  function toggleTask(id) {
    tasks.forEach(function (t) {
      if (t.id === id) t.completed = !t.completed;
    });
    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter(function (t) { return t.id !== id; });
    saveTasks();
    render();
  }

  function clearCompleted() {
    tasks = tasks.filter(function (t) { return !t.completed; });
    saveTasks();
    render();
  }

  function setFilter(newFilter) {
    filter = newFilter;
    filterBtns.forEach(function (btn) {
      var isOn = btn.getAttribute('data-filter') === filter;
      btn.classList.toggle('active', isOn);
      btn.setAttribute('aria-pressed', String(isOn));
    });
    render();
  }

  function visibleTasks() {
    if (filter === 'active')    return tasks.filter(function (t) { return !t.completed; });
    if (filter === 'completed') return tasks.filter(function (t) { return t.completed; });
    return tasks;
  }

  function buildItem(task, isNew) {
    var li = document.createElement('li');
    li.className = 'task-item' + (task.completed ? ' completed' : '') + (isNew ? ' is-new' : '');
    li.setAttribute('data-id', task.id);

    var check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task-check';
    check.checked = task.completed;
    check.id = 'chk-' + task.id;
    check.setAttribute('aria-label', 'Mark "' + task.text + '" as ' + (task.completed ? 'active' : 'completed'));

    var label = document.createElement('label');
    label.className = 'task-text';
    label.setAttribute('for', check.id);
    label.textContent = task.text;

    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-delete';
    del.textContent = 'Delete';
    del.setAttribute('aria-label', 'Delete "' + task.text + '"');

    li.appendChild(check);
    li.appendChild(label);
    li.appendChild(del);
    return li;
  }

  function renderEmptyState(shownCount) {
    if (shownCount > 0) { emptyState.hidden = true; return; }

    var messages = {
      all:       ['Your list is empty', 'Type a task above and press Add Task.'],
      active:    ['Nothing left to do', 'Every task is finished. Nice work!'],
      completed: ['No completed tasks yet', 'Tick a task to see it here.']
    };
    emptyTitle.textContent = messages[filter][0];
    emptyText.textContent  = messages[filter][1];
    emptyState.hidden = false;
  }

  function renderSummary() {
    var left  = activeCount();
    var total = tasks.length;
    var done  = total - left;
    var pct   = total === 0 ? 0 : Math.round((done / total) * 100);

    counterEl.innerHTML = '<strong>' + left + '</strong> ' + (left === 1 ? 'task' : 'tasks') + ' left';

    clearBtn.disabled = done === 0;

    progressBar.style.width = pct + '%';
    progressTrk.setAttribute('aria-valuenow', String(pct));

    if (total === 0)      progressTxt.textContent = 'Add your first task to get started.';
    else if (left === 0)  progressTxt.textContent = 'All ' + total + ' tasks done. Time for a break!';
    else                  progressTxt.textContent = done + ' of ' + total + ' done (' + pct + '%).';
  }

  function render(newId) {
    var shown = visibleTasks();
    var frag  = document.createDocumentFragment();

    shown.forEach(function (task) {
      frag.appendChild(buildItem(task, task.id === newId));
    });

    listEl.innerHTML = '';
    listEl.appendChild(frag);

    renderEmptyState(shown.length);
    renderSummary();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    addTask(input.value);
  });

  input.addEventListener('input', clearError);

  listEl.addEventListener('click', function (event) {
    var item = event.target.closest('.task-item');
    if (!item) return;
    var id = item.getAttribute('data-id');

    if (event.target.closest('.btn-delete')) deleteTask(id);
  });

  listEl.addEventListener('change', function (event) {
    if (!event.target.classList.contains('task-check')) return;
    toggleTask(event.target.closest('.task-item').getAttribute('data-id'));
  });

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setFilter(btn.getAttribute('data-filter'));
    });
  });

  clearBtn.addEventListener('click', clearCompleted);

  dateEl.textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  render();
})();
