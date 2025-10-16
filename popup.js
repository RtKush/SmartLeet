// Attach actions to sidebar buttons (.side-action). Each button has data-type (hint/approach/brute/optimized)
document.querySelectorAll('.side-action').forEach(btn => {
    btn.addEventListener('click', () => {
        setActiveButton(btn);
        // when a section is clicked open the centered modal and render into it
        const type = btn.dataset.type;
        const modalBackdrop = document.getElementById('modal-backdrop');
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modal-content');
        renderPlaceholder(modalContent, `Generating ${type}...`);
        openModalUI();
        handleAction(type, modalContent);
    });
});

// quick bar buttons open modal with the same behavior but show centered
document.querySelectorAll('.quick-btn').forEach(qb => qb.addEventListener('click', async () => {
    const type = qb.dataset.type;
    setActiveButton(document.querySelector('.side-action[data-type="' + type + '"]'));
    const modalContent = document.getElementById('modal-content');
    renderPlaceholder(modalContent, `Generating ${type}...`);
    openModalUI();
    await handleAction(type, modalContent);
    attachModalCodeActions(modalContent);
}));


function openModalWithCurrentContent(type){
    const modalContent = document.getElementById('modal-content');
    // clone the output content into modal
    modalContent.innerHTML = document.getElementById('output').innerHTML;
    openModalUI();
    attachModalCodeActions(modalContent);
}

function attachModalCodeActions(modalContent){
    // per-code actions disabled — top Copy/Download controls are used instead
    return;
}

// modal controls
document.getElementById('close-modal').addEventListener('click', ()=>closeModal());
document.getElementById('modal-backdrop').addEventListener('click', (e)=>{ if(e.target.id==='modal-backdrop') closeModal(); });

// Accessibility helpers: manage inert and focus so aria-hidden isn't set on a focused element
let __prevFocusedElement = null;
function setInertForBackground(flag){
    // mark all top-level children except the modal backdrop as inert when modal open
    Array.from(document.body.children).forEach(child => {
        if(child.id === 'modal-backdrop') return;
        try{ child.inert = flag; }catch(e){}
        if(flag) child.setAttribute('aria-hidden','true'); else child.removeAttribute('aria-hidden');
    });
}

function openModalUI(){
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('modal');
    modalBackdrop.style.display = 'flex';
    modalBackdrop.removeAttribute('aria-hidden');
    // set inert on background to prevent focus/interaction
    __prevFocusedElement = document.activeElement;
    setInertForBackground(true);
    setTimeout(()=>{
        modal.classList.add('show');
        // focus the close button inside modal
        const closeBtn = document.getElementById('close-modal');
        try{ closeBtn?.focus(); }catch(e){}
    }, 20);
}

function closeModal(){
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('modal');
    modal.classList.remove('show');
    setTimeout(()=>{
        modalBackdrop.style.display='none';
        modalBackdrop.setAttribute('aria-hidden','true');
        document.getElementById('modal-content').innerHTML='';
        // remove inert and restore focus
        setInertForBackground(false);
        try{ __prevFocusedElement?.focus(); }catch(e){}
        __prevFocusedElement = null;
    }, 220);
}

// Solution panel removed — modal-first flow handles copy/download/close

// make modal draggable by header
(()=>{
    const modal = document.getElementById('modal');
    const header = document.getElementById('modal-header');
    let isDown=false, startX=0, startY=0, origX=0, origY=0;
    header?.addEventListener('mousedown',(e)=>{
        isDown=true; header.style.cursor='grabbing'; startX=e.clientX; startY=e.clientY;
        const rect = modal.getBoundingClientRect(); origX = rect.left; origY = rect.top;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
    function onMove(e){ if(!isDown) return; const dx=e.clientX-startX, dy=e.clientY-startY; modal.style.transform=`translate(${dx}px, ${dy}px)`; }
    function onUp(){ isDown=false; header.style.cursor='grab'; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); setTimeout(()=>modal.style.transform='none',200); }
})();

function showToast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show'); t.setAttribute('aria-hidden','false');
    setTimeout(()=>{ t.classList.remove('show'); t.setAttribute('aria-hidden','true'); }, 1400);
}

// Focus trap and Escape handling for modal
document.addEventListener('keydown', (e)=>{
    const modal = document.getElementById('modal');
    const backdrop = document.getElementById('modal-backdrop');
    if(!backdrop || backdrop.style.display !== 'flex') return;
    if(e.key === 'Escape') { closeModal(); return; }
    if(e.key === 'Tab'){
        // keep focus inside modal
        const focusable = modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])');
        if(!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
});

// Persist #modal-cut checkbox state
document.addEventListener('DOMContentLoaded', ()=>{
    try{
        const saved = localStorage.getItem('modal_cut');
        const mc = document.getElementById('modal-cut');
        if(saved !== null && mc){ mc.checked = saved === 'true'; }
    }catch(e){}
    // when checkbox changes, persist
    const mcElem = document.getElementById('modal-cut');
    mcElem?.addEventListener('change', ()=>{ try{ localStorage.setItem('modal_cut', mcElem.checked ? 'true' : 'false'); }catch(e){} });

    // load saved language from chrome.storage.sync (if any)
    try{
        chrome.storage.sync.get(['language'], ({ language }) => {
            const sel = document.getElementById('language');
            if(sel && language) sel.value = language;
        });
    }catch(e){}

    // save changes to language selection to chrome.storage.sync and re-render modal content
    const langSel = document.getElementById('language');
    langSel?.addEventListener('change', async ()=>{
        try{ chrome.storage.sync.set({ language: langSel.value }); }catch(e){}
        try{
            const modalContent = document.getElementById('modal-content');
            if(modalContent && modalContent.dataset.raw){
                // re-render using stored raw text
                renderAnswer(modalContent, modalContent.dataset.raw);
                attachModalCodeActions(modalContent);

                // If current raw does not include code for selected language, re-fetch from API
                const sel = (langSel.value || 'java').toLowerCase();
                    const aliases = langAliases(sel);
                    const fencedRe = new RegExp('```\\s*(?:' + aliases.map(a=>escapeForRegExp(a)).join('|') + ')\\b','i');
                    const labeledRe = new RegExp('\\*\\*(?:' + aliases.map(a=>escapeForRegExp(a)).join('|') + '|JS|Py|Java)\\s*Code\\*\\*','i');
                const raw = modalContent.dataset.raw || '';
                const hasMatch = fencedRe.test(raw) || labeledRe.test(raw);
                const lastFetch = modalContent.dataset.lastFetchLang || '';
                // count rendered non-empty code blocks
                const renderedNonEmpty = Array.from(modalContent.querySelectorAll('.code pre')).filter(p => p.textContent && p.textContent.trim()).length;
                if((!hasMatch || renderedNonEmpty === 0) && lastFetch !== sel){
                    modalContent.dataset.lastFetchLang = sel;
                    renderPlaceholder(modalContent, `Generating ${modalContent.dataset.type} in ${sel}...`);
                    await handleAction(modalContent.dataset.type, modalContent);
                }
            }
        }catch(e){}
    });
});

// download all with filename based on selected language
document.getElementById('download-all').addEventListener('click', ()=>{
    const modalContent = document.getElementById('modal-content');
    const text = modalContent.innerText;
    const lang = document.getElementById('language')?.value || 'java';
    const ext = lang === 'python' ? 'py' : (lang === 'javascript' ? 'js' : (lang === 'c++' ? 'cpp' : 'java'));
    const filename = `solution.${ext}`;
    const blob = new Blob([text], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// copy all / download (context-aware)
document.getElementById('copy-all').addEventListener('click', async ()=>{
    const modalContent = document.getElementById('modal-content');
    try{
        const text = extractCopyTextForModal(modalContent);
        await navigator.clipboard.writeText(text);
    }catch(e){ console.error(e); }
    // if Allow cut is checked, remove modal content after copying
    if(document.getElementById('modal-cut')?.checked){ modalContent.innerHTML = ''; }
});

document.getElementById('download-all').addEventListener('click', ()=>{
    const modalContent = document.getElementById('modal-content');
    const text = extractCopyTextForModal(modalContent);
    const blob = new Blob([text], {type:'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'solution.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// extract text to copy/download based on modal context
function extractCopyTextForModal(modalContent){
    if(!modalContent) return '';
    const curType = (modalContent.dataset.type || '').toLowerCase();
    const sel = (document.getElementById('language')?.value || 'java').toLowerCase();
    // for hints/approach return full text
    if(curType === 'hint' || curType === 'approach'){
        return modalContent.innerText;
    }
    // for brute/optimized prefer code-only; fall back to full text
    const codePres = Array.from(modalContent.querySelectorAll('.code pre'));
    if(codePres.length){
        return codePres.map(p=>p.textContent.trim()).join('\n\n');
    }
    // fallback: try to extract fenced blocks from the raw text for the selected language
    try{
        const aliases = langAliases(sel);
        const raw = modalContent.dataset.raw || '';
        const fencedRe = new RegExp('```\\s*(?:' + aliases.map(a=>escapeForRegExp(a)).join('|') + ')\\n([\\s\\S]*?)```','ig');
        let m; const parts=[];
        while((m = fencedRe.exec(raw)) !== null){
            if(m[1] && m[1].trim()) parts.push(m[1].trim());
        }
        if(parts.length) return parts.join('\n\n');
    }catch(e){}

    // last resort: if the raw contains triple-backtick blocks without language tag, return them
    try{
        const raw = modalContent.dataset.raw || '';
        const genericRe = /```\n([\s\S]*?)```/g;
        let gm; const parts=[];
        while((gm = genericRe.exec(raw)) !== null){ if(gm[1] && gm[1].trim()) parts.push(gm[1].trim()); }
        if(parts.length) return parts.join('\n\n');
    }catch(e){}

    // fallback: return entire modal text
    return modalContent.innerText;
}

async function handleAction(type, container){
    // container: optional element to render into (e.g., modal content). Defaults to main output.
    const out = container || document.getElementById('output');
    try{ out.dataset.type = type; out.dataset.lastFetchLang = ''; }catch(e){}
    const lang = document.getElementById('language')?.value || 'java';
    renderPlaceholder(out, `Generating ${type}...`);

    // built-in fallback content so the UI responds even without API
    const fallback = {
        hint: `Conceptual Approach\n\nThe core idea is to iteratively compare the heads of the two lists and pick the smaller one to add to our merged list. Continue until one list is exhausted, then append remaining elements.`,
        approach: `Step-by-Step Walkthrough with Example:\n\n1. Initialization: Start with list1 = [1,2,4] and list2 = [1,3,4]. Create merged_head and tail (null).\n2. First Comparison: compare 1 and 1 -> pick from list1 -> merged [1].\n3. Second: compare 2 and 1 -> pick from list2 -> merged [1,1].\n4. Third: compare 2 and 3 -> pick 2 -> merged [1,1,2].\n5. Fourth: pick 3 -> merged [1,1,2,3].\n6. Fifth: pick 4 (tie) -> merged [1,1,2,3,4].\n7. Append remaining 4 -> [1,1,2,3,4,4].\n8. Return merged_head.`,
        brute: `Brute Force:\n\nCreate a new list and repeatedly choose the smaller head from the two lists. Handle ties arbitrarily. Complexity O(n+m).`,
        optimized: `Optimized:\n\nUsing a dummy head and tail pointer allows O(1) append; iterate through both lists once. Time O(n+m), space O(1) additional (relinking nodes) or O(n+m) if creating new nodes.`
    };

    // get user's api key
    chrome.storage.sync.get(['geminiApiKey'], ({ geminiApiKey }) => {
        if (!geminiApiKey) {
            renderError(output, 'No API key set, click the gear icon to add one.');
            return;
        }

        // current tab
        chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
            if (!tab || !tab.id) {
                renderError(output, 'No active tab found.');
                return;
            }

            try {
                const url = new URL(tab.url);
                if (url.hostname !== 'leetcode.com' && url.hostname !== 'www.leetcode.com') {
                    renderError(output, 'This extension only works on LeetCode problem pages.');
                    return;
                }
            } catch (e) {
                renderError(output, 'Invalid tab URL.');
                return;
            }

            // send message to content script
            chrome.tabs.sendMessage(
                tab.id,
                { action: 'getProblem' },
                async (response) => {
                    if (chrome.runtime.lastError) {
                        renderError(output, 'Please reload the page');
                        return;
                    }
                    if (!response) {
                        renderError(output, 'No response from content script.');
                        return;
                    }
                    const { problem } = response;
                    if (!problem) {
                        renderError(output, "Couldn't extract text from this page.");
                        return;
                    }

                    // check if solution already saved
                    const saved = await loadSolution(tab.id, type);
                    if (saved) {
                        // only use saved solution if it contains code for the requested language
                        const sel = (document.getElementById('language')?.value || 'java').toLowerCase();
                            const aliases = langAliases(sel);
                            const fencedRe = new RegExp('```\\s*(?:' + aliases.map(a=>escapeForRegExp(a)).join('|') + ')\\b','i');
                            const labeledRe = new RegExp('\\*\\*(?:' + aliases.map(a=>escapeForRegExp(a)).join('|') + '|JS|Py|Java)\\s*Code\\*\\*','i');
                        const hasMatch = fencedRe.test(saved) || labeledRe.test(saved);
                        if(hasMatch){
                            renderAnswer(out, saved);
                            try{ attachModalCodeActions(out); }catch(e){}
                            // expand only the requested section within this container
                            try{ expandOnly(mapTypeToTitle(type)); }catch(e){}
                            return;
                        }
                        // otherwise fall through to request a fresh language-specific answer
                    }

                    // otherwise call Gemini
                    try {
                        const answer = await getGeminiSolution(problem, type, lang, geminiApiKey);
                        renderAnswer(out, answer);
                        try{ attachModalCodeActions(out); }catch(e){}

                        // expand only the requested section
                        try{ expandOnly(mapTypeToTitle(type)); }catch(e){}

                        // save solution
                        saveSolution(tab.id, type, answer);
                    } catch (error) {
                        // fallback to built-in content when Gemini fails
                        const text = fallback[type] || fallback['approach'];
                        renderAnswer(out, text);
                        try{ attachModalCodeActions(out); }catch(e){}
                        try{ expandOnly(mapTypeToTitle(type)); }catch(e){}
                    }
                }
            );
        });
    });
}

// DOMContentLoaded saved rendering removed—modal-only UI now.

function setActiveButton(btn){
    document.querySelectorAll('.sections-list .side-action').forEach(b=>b.classList.remove('active'));
    if(btn) btn.classList.add('active');
}

// Helpers to render structured HTML into output
function escapeHtml(str){
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// escape string for literal insertion into RegExp
function escapeForRegExp(s){
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// return aliases for a logical language selection (used to match fenced tags and labeled blocks)
function langAliases(sel){
    const s = (sel||'').toLowerCase();
    if(s === 'js' || s === 'javascript') return ['js','javascript'];
    if(s === 'py' || s === 'python') return ['py','python'];
    if(s === 'cpp' || s === 'c++') return ['cpp','c++','cplusplus'];
    if(s === 'c#' || s === 'csharp') return ['c#','csharp'];
    if(s === 'java') return ['java'];
    return [s];
}

function renderPlaceholder(container, text){
    container.innerHTML = `<p class="muted">${escapeHtml(text)}</p>`;
}

function renderError(container, text){
    container.innerHTML = `<p class="muted">${escapeHtml(text)}</p>`;
}

function renderAnswer(container, text){
    // keep the raw text on the container so we can re-render when language changes
    try{ container.dataset.raw = text; }catch(e){}
    // Try to split into sections by simple headings (Hint:, Approach:, Brute Force:, Optimized:)
    const headings = ["Hint:", "Approach:", "Brute Force:", "Optimized:"];
    let parts = [];
    // normalize Windows CRLF
    const normalized = text.replace(/\r\n/g, "\n");

    let found = false;
    headings.forEach((h) => {
        const idx = normalized.indexOf(h);
        if (idx !== -1) found = true;
    });

    if (found) {
        // split by heading occurrences
        let remaining = normalized;
        while (remaining.length) {
            const nextIdx = Math.min(...headings.map(h => {
                const i = remaining.indexOf(h);
                return i === -1 ? Infinity : i;
            }));

            if (nextIdx !== 0) {
                // if some leading text exists, attach it as generic
                const lead = remaining.slice(0, nextIdx === Infinity ? remaining.length : nextIdx).trim();
                if (lead) parts.push({title: null, body: lead});
            }

            if (nextIdx === Infinity) break;

            // find which heading it is
            const h = headings.find(h => remaining.indexOf(h) === nextIdx);
            // remove heading
            remaining = remaining.slice(nextIdx + h.length);
            // find next heading index
            const next = Math.min(...headings.map(h2 => {
                const i = remaining.indexOf(h2);
                return i === -1 ? Infinity : i;
            }));
            const body = remaining.slice(0, next === Infinity ? remaining.length : next).trim();
            parts.push({title: h.replace(':',''), body});
            remaining = next === Infinity ? "" : remaining.slice(next);
        }
    } else {
        parts = [{title: null, body: normalized}];
    }

    // render parts
    container.innerHTML = '';
    parts.forEach(part => {
        const section = document.createElement('div');
        section.className = 'section';
        section.classList.add('fade-in');
        if (part.title) {
            const h3 = document.createElement('h3');
            const left = document.createElement('span');
            left.textContent = part.title;

            const controls = document.createElement('div');
            controls.className = 'controls-small';

            // Hide collapse toggle for Approach and Optimized — show these expanded by default
            if(part.title !== 'Approach' && part.title !== 'Optimized'){
                const collapseBtn = document.createElement('button');
                collapseBtn.className = 'collapse-toggle';
                collapseBtn.type = 'button';
                // read collapse state from storage (per title)
                const collapsed = getCollapseState(part.title);
                collapseBtn.textContent = collapsed ? 'Expand' : 'Collapse';
                collapseBtn.addEventListener('click', () => {
                    const newState = !isCollapsed(section);
                    setCollapseState(part.title, newState);
                    toggleCollapse(section, newState);
                    collapseBtn.textContent = newState ? 'Expand' : 'Collapse';
                });
                controls.appendChild(collapseBtn);
            }

            h3.appendChild(left);
            h3.appendChild(controls);
            section.appendChild(h3);
        }

        // if contains fenced code block markers (```), parse them and render only blocks matching the selected language
        if (/```/.test(part.body)){
            // capture any non-newline sequence after the opening backticks as the language tag
            // this allows tags like `c++`, `c#`, `cpp`, `csharp` etc.
            const codeRegex = /```([^\n`]+)?\n([\s\S]*?)```/g;
            let lastIdx = 0;
            const blocks = [];
            let m;
            while((m = codeRegex.exec(part.body)) !== null){
                const before = part.body.slice(lastIdx, m.index);
                if(before && before.trim()){
                    const p = document.createElement('p');
                    p.innerHTML = escapeHtml(before).replace(/\n/g,'<br>');
                    section.appendChild(p);
                }
                const langTag = (m[1] || '').toLowerCase().trim();
                const codeText = m[2] || '';
                blocks.push({ lang: langTag, code: codeText.trim() });
                lastIdx = codeRegex.lastIndex;
            }
            const tail = part.body.slice(lastIdx);
            if(tail && tail.trim()){
                const p = document.createElement('p');
                p.innerHTML = escapeHtml(tail).replace(/\n/g,'<br>');
                section.appendChild(p);
            }

            // if no fenced blocks found, try to parse labeled sections like '**Java Code**' or '**Python Code**'
            if(blocks.length === 0){
                const labelRegex = /\*\*(Java|Python|C\+\+|JavaScript|JS|Py)\s*Code\*\*\s*([\s\S]*?)(?=\n\s*\n\*\*|$)/gi;
                let lm;
                while((lm = labelRegex.exec(part.body)) !== null){
                    blocks.push({ lang: lm[1].toLowerCase(), code: lm[2].trim() });
                }
            }

            // decide which blocks to render based on selected language
            const selected = (document.getElementById('language')?.value || 'java').toLowerCase();
            function normalizeLang(s){
                if(!s) return '';
                s = s.toLowerCase();
                if(s === 'js' || s === 'javascript') return 'javascript';
                if(s === 'py' || s === 'python') return 'python';
                // accept cpp and c++ and map both to the canonical 'c++'
                if(s === 'cpp' || s === 'c++') return 'c++';
                if(s === 'c#' || s === 'csharp') return 'c#';
                return s;
            }
            const normSel = normalizeLang(selected);
            let matched = blocks.filter(b => normalizeLang(b.lang) === normSel);
            if(matched.length === 0){
                // fallback: include untagged blocks or all blocks if no exact match
                matched = blocks.filter(b => !b.lang);
            }
            if(matched.length === 0) matched = blocks; // last resort

            matched.forEach(b => {
                if(!b.code || !b.code.trim()) return; // skip empty code
                const wrap = document.createElement('div');
                wrap.className = 'code-wrap';
                const codeWrap = document.createElement('div');
                codeWrap.className = 'code';
                const pre = document.createElement('pre');
                pre.textContent = b.code;
                codeWrap.appendChild(pre);
                wrap.appendChild(codeWrap);
                section.appendChild(wrap);
            });
        } else {
            const p = document.createElement('p');
            p.innerHTML = escapeHtml(part.body).replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>');
            section.appendChild(p);
        }

        // apply initial collapsed state
        const initState = part.title ? getCollapseState(part.title) : false;
        if (initState) toggleCollapse(section, true);
        container.appendChild(section);
    });
}

// solution-panel removed; modal-first flow replaces show/hide helpers

// collapse helpers (use chrome.storage to persist per-tab state key 'collapsed_<title>')
function getCollapseState(title){
    try{
        const raw = localStorage.getItem('collapsed_' + title);
        // If user hasn't saved a preference:
        // - default to expanded for all sections
        if (raw === null) return false;
        return raw === 'true';
    }catch(e){return false}
}
function setCollapseState(title, collapsed){
    try{ localStorage.setItem('collapsed_' + title, collapsed ? 'true' : 'false'); }catch(e){}
}
function toggleCollapse(section, collapse){
    if(collapse){
        // hide all non-heading children
        Array.from(section.children).forEach((c, i) => { if(i>0) c.style.display='none'; });
    }else{
        Array.from(section.children).forEach((c, i) => { if(i>0) c.style.display='block'; });
    }
}
function isCollapsed(section){
    // check first non-heading child
    return Array.from(section.children).slice(1).every(c => c.style.display === 'none');
}

function mapTypeToTitle(type){
    if(!type) return '';
    if(type === 'brute') return 'Brute Force';
    if(type === 'optimized') return 'Optimized';
    return type.charAt(0).toUpperCase() + type.slice(1);
}

function expandOnly(title){
    // collapse all sections first
    const secs = Array.from(document.querySelectorAll('.section'));
    secs.forEach(s => toggleCollapse(s, true));
    // find the section matching title and expand it
    const target = secs.find(s => s.querySelector('h3 span')?.textContent === title);
    if(target){
        toggleCollapse(target, false);
        setCollapseState(title, false);
    }
}

// expand/collapse all
document.getElementById('expand-all')?.addEventListener('click', ()=>{
    document.querySelectorAll('.section').forEach(s=>{ toggleCollapse(s,false); const title=s.querySelector('h3 span')?.textContent; if(title) setCollapseState(title,false); });
});
document.getElementById('collapse-all')?.addEventListener('click', ()=>{
    document.querySelectorAll('.section').forEach(s=>{ toggleCollapse(s,true); const title=s.querySelector('h3 span')?.textContent; if(title) setCollapseState(title,true); });
});

// keyboard shortcuts
document.addEventListener('keydown', (e)=>{
    if(document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    const key = e.key.toLowerCase();
    if(key==='h'){ const mc=document.getElementById('modal-content'); renderPlaceholder(mc,'Generating hint...'); openModalUI(); handleAction('hint', mc).then(()=>attachModalCodeActions(mc)); }
    if(key==='a'){ const mc=document.getElementById('modal-content'); renderPlaceholder(mc,'Generating approach...'); openModalUI(); handleAction('approach', mc).then(()=>attachModalCodeActions(mc)); }
    if(key==='b'){ const mc=document.getElementById('modal-content'); renderPlaceholder(mc,'Generating brute...'); openModalUI(); handleAction('brute', mc).then(()=>attachModalCodeActions(mc)); }
    if(key==='o'){ const mc=document.getElementById('modal-content'); renderPlaceholder(mc,'Generating optimized...'); openModalUI(); handleAction('optimized', mc).then(()=>attachModalCodeActions(mc)); }
});

// (sidebar click handlers already set earlier to render into modal)

    // open options page
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'open-options'){
            if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
            else window.open(chrome.runtime.getURL('options.html'));
        }
    });
