    (function () {
      const doc = document;
      const statusContainer = doc.querySelector('.selected-tags');
      const keywordSelect = doc.querySelector('.input-select');
      const keywordInput = doc.querySelector('.input-text');
      const industryInput = doc.querySelector('.input-with-icon input');
      const tagsContainer = doc.querySelector('.input-tags');

      if (keywordSelect && !keywordSelect.dataset.tagLabel) {
        keywordSelect.dataset.tagLabel = '关键词范围';
      }
      if (keywordInput && !keywordInput.dataset.tagLabel) {
        keywordInput.dataset.tagLabel = '关键词';
      }
      if (industryInput && !industryInput.dataset.tagLabel) {
        industryInput.dataset.tagLabel = '所属行业';
      }
      if (tagsContainer && !tagsContainer.dataset.tagLabel) {
        const subLabel = tagsContainer.previousElementSibling;
        tagsContainer.dataset.tagLabel = subLabel ? subLabel.textContent.trim() : '已选地域';
      }

      function getSectionTitle(el) {
        const section = el.closest('.filter-section');
        if (!section) return '';
        const title = section.querySelector('.section-title');
        return title ? title.textContent.trim() : '';
      }

      function getSubTitle(el) {
        const row = el.closest('.option-row');
        if (!row) return '';
        const sub = row.querySelector('.sub-title');
        return sub ? sub.textContent.trim() : '';
      }

      function cleanText(source) {
        return source.textContent.replace(/SVIP/g, '').replace(/\s+/g, ' ').trim();
      }

      function formatLabel(prefix, value) {
        const group = (prefix || '').trim();
        const label = (value || '').trim();
        if (!group) return label;
        if (!label) return group;
        return `${group}: ${label}`;
      }

      function assignMeta() {
        let chipCounter = 0;
        doc.querySelectorAll('.checkbox input').forEach((input, idx) => {
          if (!input.dataset.tagKey) input.dataset.tagKey = `checkbox-${idx}`;
          input.dataset.group = getSubTitle(input) || getSectionTitle(input) || '';
          input.dataset.label = cleanText(input.parentElement);
        });
        doc.querySelectorAll('.toggle').forEach((toggle, idx) => {
          if (!toggle.dataset.tagKey) toggle.dataset.tagKey = `toggle-${idx}`;
          if (!toggle.dataset.group) toggle.dataset.group = getSubTitle(toggle) || getSectionTitle(toggle) || '';
          if (!toggle.dataset.label) toggle.dataset.label = cleanText(toggle);
        });
        doc.querySelectorAll('.filter-pill').forEach((pill, idx) => {
          if (!pill.dataset.tagKey) pill.dataset.tagKey = `pill-${idx}`;
          if (!pill.dataset.group) pill.dataset.group = getSectionTitle(pill) || '';
          if (!pill.dataset.label) pill.dataset.label = cleanText(pill);
        });
        doc.querySelectorAll('select.input-select').forEach((select, idx) => {
          if (!select.dataset.tagKey) select.dataset.tagKey = `select-${idx}`;
        });
        doc.querySelectorAll('input[type="text"]').forEach((input, idx) => {
          if (!input.dataset.tagKey) input.dataset.tagKey = `text-${idx}`;
          if (!input.dataset.tagLabel) {
            const inline = input.closest('.inline-input');
            if (inline) {
              const label = inline.querySelector('span');
              input.dataset.tagLabel = label ? label.textContent.trim() : getSectionTitle(input);
            } else {
              input.dataset.tagLabel = getSectionTitle(input) || '输入条件';
            }
          }
        });
        doc.querySelectorAll('.input-tags').forEach((container) => {
          const tagLabel = container.dataset.tagLabel || getSubTitle(container) || getSectionTitle(container);
          container.dataset.tagLabel = tagLabel;
          container.querySelectorAll('.tag-chip').forEach((chip) => {
            if (!chip.dataset.tagKey) chip.dataset.tagKey = `chip-${chipCounter++}`;
            if (!chip.dataset.value) chip.dataset.value = cleanText(chip);
          });
        });
      }

      function buildTag(label, key, type) {
        const tag = doc.createElement('span');
        tag.className = 'selected-tag';
        tag.dataset.key = key;
        tag.dataset.type = type;
        tag.innerHTML = `<span>${label}</span><button type="button" class="tag-remove" aria-label="移除筛选">×</button>`;
        return tag;
      }

      function updateSummary() {
        const tags = [];

        doc.querySelectorAll('.checkbox input').forEach((input) => {
          if (input.checked) {
            const label = formatLabel(input.dataset.group, input.dataset.label);
            tags.push({ label, key: input.dataset.tagKey, type: 'checkbox' });
          }
        });

        doc.querySelectorAll('.toggle.active').forEach((toggle) => {
          const label = formatLabel(toggle.dataset.group, toggle.dataset.label);
          tags.push({ label, key: toggle.dataset.tagKey, type: 'toggle' });
        });

        doc.querySelectorAll('.filter-pill.active').forEach((pill) => {
          const label = formatLabel(pill.dataset.group, pill.dataset.label);
          tags.push({ label, key: pill.dataset.tagKey, type: 'pill' });
        });

        doc.querySelectorAll('select.input-select').forEach((select) => {
          if (select.selectedIndex > 0) {
            const option = select.options[select.selectedIndex];
            const label = formatLabel(select.dataset.tagLabel || getSectionTitle(select), option.text.trim());
            tags.push({ label, key: select.dataset.tagKey, type: 'select' });
          }
        });

        doc.querySelectorAll('input[type="text"]').forEach((input) => {
          const value = input.value.trim();
          if (value && input.dataset.tagLabel) {
            const label = formatLabel(input.dataset.tagLabel, value);
            tags.push({ label, key: input.dataset.tagKey, type: 'text' });
          }
        });

        doc.querySelectorAll('.input-tags .tag-chip').forEach((chip) => {
          const container = chip.closest('.input-tags');
          const label = formatLabel(container ? container.dataset.tagLabel : '', chip.dataset.value || cleanText(chip));
          tags.push({ label, key: chip.dataset.tagKey, type: 'chip' });
        });

        statusContainer.innerHTML = '';
        if (!tags.length) {
          const hint = doc.createElement('span');
          hint.className = 'empty-hint';
          hint.textContent = '暂无筛选条件';
          statusContainer.appendChild(hint);
          return;
        }

        tags.forEach(({ label, key, type }) => {
          statusContainer.appendChild(buildTag(label, key, type));
        });
      }

      function registerEvents() {
        doc.querySelectorAll('.checkbox input').forEach((input) => {
          input.addEventListener('change', updateSummary);
        });

        doc.querySelectorAll('select.input-select').forEach((select) => {
          select.addEventListener('change', updateSummary);
        });

        doc.querySelectorAll('input[type="text"]').forEach((input) => {
          input.addEventListener('input', updateSummary);
        });

        if (tagsContainer) {
          tagsContainer.addEventListener('click', (event) => {
            const remove = event.target.closest('.tag-chip-remove');
            if (remove) {
              const chip = remove.closest('.tag-chip');
              if (chip) {
                chip.remove();
                updateSummary();
              }
            }
          });
        }

        statusContainer.addEventListener('click', (event) => {
          const remove = event.target.closest('.tag-remove');
          if (!remove) return;
          const tagElement = remove.parentElement;
          const type = tagElement.dataset.type;
          const key = tagElement.dataset.key;
          if (type === 'checkbox') {
            const input = doc.querySelector(`.checkbox input[data-tag-key="${key}"]`);
            if (input) {
              input.checked = false;
              input.dispatchEvent(new Event('change', { bubbles: false }));
            }
          } else if (type === 'toggle') {
            const toggle = doc.querySelector(`.toggle[data-tag-key="${key}"]`);
            if (toggle) {
              toggle.classList.remove('active');
              updateSummary();
            }
          } else if (type === 'pill') {
            const pill = doc.querySelector(`.filter-pill[data-tag-key="${key}"]`);
            if (pill) {
              pill.classList.remove('active');
              updateSummary();
            }
          } else if (type === 'select') {
            const select = doc.querySelector(`select[data-tag-key="${key}"]`);
            if (select) {
              select.selectedIndex = 0;
              select.dispatchEvent(new Event('change', { bubbles: false }));
            }
          } else if (type === 'text') {
            const input = doc.querySelector(`input[data-tag-key="${key}"]`);
            if (input) {
              input.value = '';
              input.dispatchEvent(new Event('input', { bubbles: false }));
            }
          } else if (type === 'chip') {
            const chip = doc.querySelector(`.tag-chip[data-tag-key="${key}"]`);
            if (chip) {
              chip.remove();
              updateSummary();
            }
          }
        });
      }

      assignMeta();
      registerEvents();

      document.addEventListener('click', function (event) {
        const toggle = event.target.closest('.toggle');
        if (toggle) {
          const group = toggle.parentElement;
          group.querySelectorAll('.toggle').forEach(item => item.classList.remove('active'));
          toggle.classList.add('active');
          updateSummary();
          return;
        }

        const pill = event.target.closest('.filter-pill');
        if (pill && !pill.classList.contains('disabled')) {
          pill.classList.toggle('active');
          updateSummary();
        }
      });

      updateSummary();
    })();
  
