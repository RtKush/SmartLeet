// Save solution in storage
async function saveSolution(tabId, type, answer) {
    return new Promise((resolve) => {
        chrome.storage.local.get(["solutions"], (res) => {
            const allSolutions = res.solutions || {};
            if (!allSolutions[tabId]) allSolutions[tabId] = {};
            allSolutions[tabId][type] = answer;
            chrome.storage.local.set({ solutions: allSolutions }, resolve);
        });
    });
}

// Load solution in storage
async function loadSolution(tabId, type) {
    return new Promise((resolve) => {
        chrome.storage.local.get(["solutions"], (res) => {
            const allSolutions = res.solutions || {};
            resolve(allSolutions[tabId]?.[type] || null);
        });
    });
}

// Get Gemini solution
async function getGeminiSolution(problem, type, lang, apiKey) {
    // normalize language into a fence tag for code blocks (e.g. c++ -> cpp)
    let fenceTag = 'java';
    try{
        if(!lang) lang = 'java';
        const l = lang.toLowerCase();
        if(l === 'c++' || l === 'cpp') fenceTag = 'cpp';
        else if(l === 'javascript' || l === 'js') fenceTag = 'javascript';
        else if(l === 'python' || l === 'py') fenceTag = 'python';
        else if(l === 'java') fenceTag = 'java';
        else fenceTag = l.replace(/[^a-z0-9]/g,'');
    }catch(e){ fenceTag = 'java'; }

    const promptMap = {
        hint: `${problem}\n\nGive only 3 concise hints to help solve the problem. No code required.`,
        approach: `${problem}\n\nExplain the approach using a short example test case. Do NOT include full solution code; keep explanation brief.`,
        brute: `${problem}\n\nProvide a short description of the brute force approach, then return the FULL solution code in ${lang} only. IMPORTANT: Return the code inside a single fenced code block using the language tag \`\`\`${fenceTag}\n<code>\n\`\`\`. Do NOT include code in any other language and do NOT include multiple code blocks for different languages. You may precede the block with one line heading like "Brute Force:" but keep extra text minimal.`,
        optimized: `${problem}\n\nProvide a short description of the optimized approach, then return the FULL solution code in ${lang} only. IMPORTANT: Return the code inside a single fenced code block using the language tag \`\`\`${fenceTag}\n<code>\n\`\`\`. Do NOT include code in any other language and do NOT include multiple code blocks for different languages. You may precede the block with one line heading like "Optimized:" but keep extra text minimal.`,
    };

    const prompt = promptMap[type] || promptMap.hint;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 },
            }),
        }
    );

    if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error?.message || "Request failed");
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No solution";
}