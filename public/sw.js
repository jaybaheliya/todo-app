self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};
  self.registration.showNotification(data.title ?? 'My Task', {
    body: data.body,
    icon: '/favicon.ico',
    tag: data.tag,
  });
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag } = e.data;
    self.registration.showNotification(title ?? 'My Task', {
      body,
      icon: '/favicon.ico',
      tag,
    });
  }
});
