"""Run against the local backend and disposable fixtures from seed-business-smoke.cjs."""
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parents[2]
fixture = json.loads((root / 'test_artifacts/business-smoke-fixture.json').read_text(encoding='utf-8'))
origin = 'http://localhost:5175'
api = 'http://localhost:3101/api'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    # External OAuth is outside this local workflow and should not make calls.
    context.route(re.compile(r'https://accounts\.google\.com/.*'), lambda route: route.abort())
    page = context.new_page()
    errors = []
    server_errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('response', lambda response: server_errors.append(f'{response.status} {response.url}')
            if '/api/' in response.url and response.status >= 500 else None)
    try:
        page.goto(f'{origin}/login')
        page.wait_for_load_state('networkidle')
        page.locator('input[name=email]').fill(fixture['adminEmail'])
        page.locator('input[name=password]').fill(fixture['password'])
        page.locator('button[type=submit]').first.click()
        page.wait_for_url(f'{origin}/admin', timeout=30000)
        page.wait_for_load_state('networkidle')
        token = page.evaluate("localStorage.getItem('phoneshop_access_token')")
        headers = {'Authorization': f'Bearer {token}'}

        unpaid = fixture['unpaid']['id']
        response = context.request.put(f'{api}/orders/{unpaid}/confirm', headers=headers)
        assert response.status == 400, response.text()

        refundable = fixture['refundable']['id']
        page.goto(f'{origin}/admin/orders/{refundable}')
        page.wait_for_load_state('networkidle')
        page.get_by_title('Hoàn tiền / Đổi trả đơn hàng này', exact=True).click()
        dialog = page.get_by_role('dialog').last
        dialog.locator('#reason').click()
        page.get_by_text('Khách hàng đổi ý trong thời hạn quy định', exact=True).last.click()
        dialog.locator('#providerReference').fill(f'BROWSER-{refundable}')
        with page.expect_response(lambda response: response.url.endswith(f'/orders/{refundable}/refund')) as refunded:
            dialog.get_by_role('button', name='Xác nhận đã hoàn tiền', exact=True).click()
        assert refunded.value.status == 201, refunded.value.text()
        result = context.request.get(f'{api}/orders/{refundable}', headers=headers).json()
        assert result.get('data', result)['status'] == 'CANCELLED'

        page.goto(f'{origin}/admin/warranties')
        page.wait_for_load_state('networkidle')
        # Search avoids relying on pagination or on other fixtures in the DB.
        search = page.get_by_placeholder(re.compile('Tìm'))
        search.fill(fixture['warranty']['code'])
        for label, step in [('Tiếp nhận máy', 'receive'), ('Xác nhận sửa xong', 'repair'), ('Trả máy cho khách', 'return')]:
            row = page.get_by_role('row').filter(has_text=fixture['warranty']['code'])
            row.get_by_role('button', name=label, exact=True).click()
            repair = page.get_by_role('dialog').last
            repair.get_by_label('Ghi chú xử lý / biên bản bàn giao').fill(f'Browser evidence: {step}')
            with page.expect_response(lambda response: response.url.endswith(f"/warranty/{fixture['warranty']['id']}/repair/{step}")) as updated:
                repair.get_by_role('button', name='Xác nhận', exact=True).click()
            assert updated.value.status == 200, updated.value.text()
            expect(repair).not_to_be_visible()
        result = context.request.get(f"{api}/warranty/{fixture['warranty']['id']}", headers=headers).json()
        assert result.get('data', result)['status'] == 'ACTIVE'
        page.screenshot(path=str(root / 'test_artifacts/business-warranty-smoke.png'), full_page=True)

        anonymous = browser.new_page(viewport={'width': 390, 'height': 844})
        anonymous.goto(f'{origin}/warranty-lookup')
        anonymous.wait_for_load_state('networkidle')
        anonymous.get_by_role('tab', name='Tra cứu theo Số điện thoại', exact=True).click()
        anonymous.locator('#warranty-phone-input').fill('0901234567')
        anonymous.get_by_role('button', name='Kiểm tra bảo hành theo số điện thoại', exact=True).click()
        expect(anonymous.get_by_text('Vui lòng đăng nhập để tra cứu bảo hành của bạn theo số điện thoại.', exact=True)).to_be_visible()
        anonymous.close()
        assert not errors, errors
        assert not server_errors, server_errors
        print('PASS: UI login, unpaid guard, pre-dispatch refund, receive/repair/return, anonymous phone lookup guard; no JS or API 5xx errors.')
    except Exception:
        page.screenshot(path=str(root / 'test_artifacts/business-smoke-failure.png'), full_page=True)
        (root / 'test_artifacts/business-smoke-failure.html').write_text(page.content(), encoding='utf-8')
        raise
    finally:
        browser.close()
