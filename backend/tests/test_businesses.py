import uuid


def test_create_business_happy_path(client_as_owner):
    resp = client_as_owner.post("/businesses", json={"name": "Boran Berber", "category": "Berber", "city": "Ankara"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Boran Berber"
    assert data["slug"] == "boran-berber"
    assert data["city"] == "Ankara"


def test_create_business_unauthenticated(client):
    # No auth override → missing Authorization header → 422
    resp = client.post("/businesses", json={"name": "X", "category": "Y"})
    assert resp.status_code == 422


def test_get_my_businesses(client_as_owner, business):
    resp = client_as_owner.get("/me/businesses")
    assert resp.status_code == 200
    names = [b["name"] for b in resp.json()]
    assert "Test Berber" in names


def test_update_business_by_owner(client_as_owner, business):
    resp = client_as_owner.patch(
        f"/businesses/{business.id}",
        json={"description": "Harika bir berber"},
    )
    assert resp.status_code == 200
    assert resp.json()["description"] == "Harika bir berber"


def test_update_business_by_non_owner(client_as_customer, business):
    resp = client_as_customer.patch(
        f"/businesses/{business.id}",
        json={"description": "Hack"},
    )
    assert resp.status_code == 403


def test_add_service_happy_path(client_as_owner, business):
    resp = client_as_owner.post(
        f"/businesses/{business.id}/services",
        json={"name": "Saç Boyama", "duration_minutes": 60, "price": 350.0},
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Saç Boyama"


def test_add_service_non_owner(client_as_customer, business):
    resp = client_as_customer.post(
        f"/businesses/{business.id}/services",
        json={"name": "X", "duration_minutes": 30, "price": 50.0},
    )
    assert resp.status_code == 403


def test_list_services(client, business, service):
    resp = client.get(f"/businesses/{business.id}/services")
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "Saç Kesimi"


def test_add_staff_happy_path(client_as_owner, business):
    resp = client_as_owner.post(
        f"/businesses/{business.id}/staff",
        json={"name": "Mehmet", "role": "Berber"},
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Mehmet"


def test_add_staff_non_owner(client_as_customer, business):
    resp = client_as_customer.post(
        f"/businesses/{business.id}/staff",
        json={"name": "X"},
    )
    assert resp.status_code == 403


def test_search_businesses(client, business):
    resp = client.get("/businesses?city=İstanbul")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert data["items"][0]["city"] == "İstanbul"


def test_search_businesses_no_results(client, business):
    resp = client.get("/businesses?city=Yokşehir")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0


def test_get_business_by_slug(client, business):
    resp = client.get(f"/businesses/{business.slug}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Test Berber"


def test_get_business_by_uuid(client, business):
    resp = client.get(f"/businesses/{business.id}")
    assert resp.status_code == 200
    assert resp.json()["slug"] == "test-berber"


def test_get_business_not_found(client):
    resp = client.get("/businesses/nonexistent-slug-xyz")
    assert resp.status_code == 404


def test_list_business_appointments_owner(client_as_owner, business):
    resp = client_as_owner.get(f"/businesses/{business.id}/appointments")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_list_business_appointments_non_owner(client_as_customer, business):
    resp = client_as_customer.get(f"/businesses/{business.id}/appointments")
    assert resp.status_code == 403
