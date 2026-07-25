fetch('http://localhost:4000/api/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voterId: '123', candidateId: 'abc' })
})
.then(res => res.text().then(text => ({ status: res.status, body: text })))
.then(data => console.log('Response 1:', data))
.catch(err => console.error(err));

setTimeout(() => {
    fetch('http://localhost:4000/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: '456', candidateId: 'def' })
    })
    .then(res => res.text().then(text => ({ status: res.status, body: text })))
    .then(data => console.log('Response 2:', data))
    .catch(err => console.error(err));
}, 1000);
