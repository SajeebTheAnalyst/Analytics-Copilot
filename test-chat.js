const history = [
  { role: 'user', text: 'What are the key trends?' },
  { role: 'assistant', text: '**Analyst Answer**: Here is the trend.\n```json\n{"_inlineChart": {"title": "Sales", "type": "bar"}}\n```' }
];

fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What is your name?',
    history: history,
    evidence: null
  })
}).then(res => res.json()).then(data => console.log(data));
