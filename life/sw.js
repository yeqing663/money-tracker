/* 生活 App · Service Worker（离线缓存 + 自动更新） */
var VERSION = 'life-v3';
var CACHE = VERSION;
var ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(CACHE).then(function(cache){ return cache.addAll(ASSETS); })
      .then(function(){ return self.skipWaiting(); })   // 新版本立刻接管
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
        .map(function(k){ return caches.delete(k); }));   // 清掉旧版本缓存
    }).then(function(){ return self.clients.claim(); })
  );
});

function isNavigation(req){
  return req.mode === 'navigate' || /index\.html$/.test(req.url) || req.url.endsWith('/life/');
}

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;

  // 页面：网络优先（保证看到最新版），断网才用缓存
  if (isNavigation(req)){
    event.respondWith(
      fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        return res;
      }).catch(function(){
        return caches.match(req).then(function(hit){
          return hit || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // 静态资源：缓存优先，后台更新
  event.respondWith(
    caches.match(req).then(function(hit){
      var network = fetch(req).then(function(res){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
        return res;
      }).catch(function(){ return hit; });
      return hit || network;
    })
  );
});
