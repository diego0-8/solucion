/**
 * Recordatorios "volver a llamar" para asesor (header + navbar).
 */
(function () {
    var POLL_MS = 5 * 60 * 1000;
    var modalId = 'modal-recordatorios-volver-llamar';
    var cache = { items: [], total: 0 };

    function ensureModal() {
        var el = document.getElementById(modalId);
        if (el) return el;
        el = document.createElement('div');
        el.id = modalId;
        el.style.cssText = 'display:none;position:fixed;z-index:11000;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.45);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';
        el.innerHTML =
            '<div style="background:#fff;border-radius:12px;max-width:420px;width:100%;max-height:85vh;overflow:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2);">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;">' +
            '<strong style="font-size:16px;color:#232759;"><i class="fas fa-bell"></i> Volver a llamar hoy</strong>' +
            '<button type="button" data-recordatorios-close style="border:none;background:transparent;font-size:22px;line-height:1;cursor:pointer;color:#888;">&times;</button>' +
            '</div>' +
            '<div id="' + modalId + '-body" style="padding:12px 16px 16px;"></div>' +
            '</div>';
        document.body.appendChild(el);
        el.addEventListener('click', function (e) {
            if (e.target === el) closeModal();
        });
        el.querySelector('[data-recordatorios-close]').addEventListener('click', closeModal);
        return el;
    }

    function closeModal() {
        var el = document.getElementById(modalId);
        if (el) el.style.display = 'none';
    }

    function openModal() {
        var el = ensureModal();
        var body = document.getElementById(modalId + '-body');
        if (!body) return;
        if (!cache.items || cache.items.length === 0) {
            body.innerHTML = '<p style="margin:0;color:#666;font-size:14px;">No tiene llamadas programadas para hoy con tipificación «volver a llamar».</p>';
        } else {
            var html = '<ul style="list-style:none;margin:0;padding:0;">';
            cache.items.forEach(function (it) {
                var nombre = escapeHtml(it.cliente_nombre || '');
                var ced = escapeHtml(it.cliente_cedula || '');
                var when = formatWhen(it.volver_llamar_programado);
                var gid = parseInt(it.cliente_id, 10);
                var url = 'index.php?action=asesor_gestionar&cliente_id=' + encodeURIComponent(gid);
                html +=
                    '<li style="border:1px solid #e9ecef;border-radius:8px;padding:12px;margin-bottom:10px;">' +
                    '<div style="font-weight:600;color:#232759;">' + nombre + '</div>' +
                    '<div style="font-size:13px;color:#666;">CC ' + ced + '</div>' +
                    '<div style="font-size:12px;color:#888;margin-top:4px;"><i class="fas fa-clock"></i> ' + when + '</div>' +
                    '<a href="' + url + '" style="display:inline-block;margin-top:10px;padding:8px 14px;background:#232759;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600;">Gestionar</a>' +
                    '</li>';
            });
            html += '</ul>';
            body.innerHTML = html;
        }
        el.style.display = 'flex';
    }

    function escapeHtml(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    function formatWhen(raw) {
        if (!raw) return '';
        var str = String(raw).replace(' ', 'T');
        var d = new Date(str);
        if (isNaN(d.getTime())) return raw;
        return d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    }

    function updateBadges(total) {
        document.querySelectorAll('[data-recordatorios-badge]').forEach(function (badge) {
            if (total > 0) {
                badge.textContent = String(total);
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        });
    }

    function fetchRecordatorios() {
        return fetch('index.php?action=recordatorios_volver_llamar', {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (!data.success) {
                    cache = { items: [], total: 0 };
                    updateBadges(0);
                    return;
                }
                cache.items = data.items || [];
                cache.total = typeof data.total === 'number' ? data.total : cache.items.length;
                updateBadges(cache.total);
            })
            .catch(function () {
                updateBadges(0);
            });
    }

    function bindTriggers() {
        document.querySelectorAll('[data-recordatorios-trigger]').forEach(function (node) {
            node.addEventListener('click', function (e) {
                e.preventDefault();
                openModal();
            });
        });
    }

    function init() {
        bindTriggers();
        fetchRecordatorios();
        setInterval(fetchRecordatorios, POLL_MS);
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) fetchRecordatorios();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
