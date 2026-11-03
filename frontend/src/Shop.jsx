
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import "./Shop.css";

const products = [
  {
    id: "g_bin",
    name: "G-Bin",
    category: "BIODEGRADABLE WASTE",
    description: "For suitable organic household waste.",
    color: "green",
    symbol: "G",
  },
  {
    id: "b_bin",
    name: "B-Bin",
    category: "DRY RECYCLABLES",
    description: "For clean, accepted recyclable materials.",
    color: "blue",
    symbol: "B",
  },
  {
    id: "combo",
    name: "G-Bin + B-Bin Combo",
    category: "COMPLETE HOUSEHOLD SET",
    description: "Both bins for household waste segregation.",
    color: "combo",
    symbol: "GB",
  },
];

const orderStatuses = {
  pending: "Awaiting confirmation",
  confirmed: "Order confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function Shop() {
  const [form, setForm] = useState({
    product_type: "combo",
    quantity: "1",
    delivery_address: "",
    customer_notes: "",
  });

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    setLoadError("");

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, product_type, quantity, status, payment_status, delivery_address, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      setLoadError(error.message || "Could not load your orders.");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const initialiseShop = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) throw error;

        if (!data.user) {
          if (active) {
            setLoadError("Please log in to access the shop.");
            setLoadingOrders(false);
          }
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("address")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (active && profile?.address) {
          setForm((previous) => ({
            ...previous,
            delivery_address: profile.address,
          }));
        }

        if (active) await loadOrders();
      } catch (error) {
        if (active) {
          setLoadError(error.message || "Could not initialise the shop.");
          setLoadingOrders(false);
        }
      }
    };

    initialiseShop();

    return () => {
      active = false;
    };
  }, [loadOrders]);

  const chooseProduct = (productId) => {
    setForm((previous) => ({
      ...previous,
      product_type: productId,
    }));

    document
      .getElementById("shop-order-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handlePlaceOrder = async (event) => {
    event.preventDefault();

    const quantity = Number(form.quantity);
    const address = form.delivery_address.trim();

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
      alert("Please enter a quantity between 1 and 50.");
      return;
    }

    if (!address) {
      alert("Please enter the delivery address.");
      return;
    }

    setSubmitting(true);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      const user = authData.user;

      if (!user) {
        alert("Your session has expired. Please log in again.");
        return;
      }

      const { data: household, error: householdError } = await supabase
        .from("households")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (householdError) throw householdError;

      if (!household) {
        alert(
          "Your household record is not available. Please contact the administrator."
        );
        return;
      }

      const { error: orderError } = await supabase.from("orders").insert({
        household_id: household.id,
        product_type: form.product_type,
        quantity,
        delivery_address: address,
        customer_notes: form.customer_notes.trim() || null,
      });

      if (orderError) throw orderError;

      alert(
        "Order request submitted successfully! The order is pending confirmation. No payment has been taken."
      );

      setForm((previous) => ({
        ...previous,
        quantity: "1",
        customer_notes: "",
      }));

      await loadOrders();
    } catch (error) {
      alert(
        "Could not submit your order: " +
          (error.message || "Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getProductName = (productType) => {
    return (
      products.find((product) => product.id === productType)?.name ||
      productType
    );
  };

  return (
    <div className="shop-page">
      <section className="shop-hero">
        <div className="shop-hero-copy">
          <span className="shop-eyebrow">THE G-BIN &amp; B-BIN SHOP</span>
          <h2>Make waste segregation a habit.</h2>
          <p>
            Choose the bins that help your household separate organic waste
            from dry recyclable materials.
          </p>
          <span className="shop-info-pill">🌱 A cleaner home starts here</span>
        </div>

        <div className="shop-hero-art" aria-hidden="true">
          <div className="shop-hero-bin green-hero-bin">G</div>
          <div className="shop-hero-bin blue-hero-bin">B</div>
        </div>
      </section>

      <div className="shop-section-heading">
        <div>
          <h2>Explore our products</h2>
          <p>Select a product to fill in your order.</p>
        </div>
      </div>

      <section className="shop-products-grid">
        {products.map((product) => (
          <article className="shop-product-card" key={product.id}>
            <div className={`shop-product-visual ${product.color}`}>
              {product.id === "combo" ? (
                <div className="shop-combo-symbols">
                  <span>G</span>
                  <span>B</span>
                </div>
              ) : (
                <div className="shop-bin-drawing">
                  <div className="shop-bin-lid" />
                  <div className="shop-bin-body">{product.symbol}</div>
                </div>
              )}
            </div>

            <span className="shop-product-category">{product.category}</span>
            <h3>{product.name}</h3>
            <p>{product.description}</p>

            <button
              type="button"
              className={
                form.product_type === product.id
                  ? "shop-select-btn selected"
                  : "shop-select-btn"
              }
              onClick={() => chooseProduct(product.id)}
            >
              {form.product_type === product.id
                ? "Selected ✓"
                : "Select product →"}
            </button>
          </article>
        ))}
      </section>

      <section className="shop-order-panel" id="shop-order-form">
        <div className="shop-section-heading">
          <div>
            <span className="shop-eyebrow">ORDER DETAILS</span>
            <h2>Place an order</h2>
            <p>Submit your request for administrator confirmation.</p>
          </div>
        </div>

        <form className="shop-order-form" onSubmit={handlePlaceOrder}>
          <div className="shop-form-field">
            <label htmlFor="shop-product">Selected product</label>
            <select
              id="shop-product"
              name="product_type"
              value={form.product_type}
              onChange={handleChange}
              required
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="shop-form-field">
            <label htmlFor="shop-quantity">Quantity</label>
            <input
              id="shop-quantity"
              name="quantity"
              type="number"
              min="1"
              max="50"
              value={form.quantity}
              onChange={handleChange}
              required
            />
          </div>

          <div className="shop-form-field shop-wide-field">
            <label htmlFor="shop-address">Delivery address</label>
            <textarea
              id="shop-address"
              name="delivery_address"
              rows="3"
              value={form.delivery_address}
              onChange={handleChange}
              placeholder="Confirm your complete delivery address"
              required
            />
          </div>

          <div className="shop-form-field shop-wide-field">
            <label htmlFor="shop-notes">Additional notes (optional)</label>
            <textarea
              id="shop-notes"
              name="customer_notes"
              rows="2"
              value={form.customer_notes}
              onChange={handleChange}
              placeholder="Add any delivery instructions"
            />
          </div>

          <div className="shop-order-notice shop-wide-field">
            <strong>Order confirmation and payment</strong>
            <p>
              This submits an order request only. The administrator must
              confirm availability and pricing. No online payment is taken
              in this version.
            </p>
          </div>

          <button
            type="submit"
            className="shop-submit-btn shop-wide-field"
            disabled={submitting}
          >
            {submitting ? "Submitting order..." : "Submit order request →"}
          </button>
        </form>
      </section>

      <section className="shop-orders-section">
        <div className="shop-section-heading">
          <div>
            <h2>My orders</h2>
            <p>Orders linked to your signed-in household.</p>
          </div>

          <button
            type="button"
            className="shop-refresh-btn"
            onClick={loadOrders}
            disabled={loadingOrders}
          >
            {loadingOrders ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {loadError && (
          <div className="shop-error-message">
            <strong>Unable to load shop data</strong>
            <p>{loadError}</p>
          </div>
        )}

        {loadingOrders ? (
          <div className="shop-empty-state">Loading your orders...</div>
        ) : orders.length === 0 ? (
          <div className="shop-empty-state">
            <span>🛍️</span>
            <h3>No orders yet</h3>
            <p>Your order requests will appear here after submission.</p>
          </div>
        ) : (
          <div className="shop-orders-list">
            {orders.map((order) => (
              <article className="shop-order-card" key={order.id}>
                <div className="shop-order-symbol">📦</div>

                <div className="shop-order-info">
                  <strong>{getProductName(order.product_type)}</strong>
                  <span>
                    Order #{order.id.slice(0, 8).toUpperCase()} · Qty{" "}
                    {order.quantity}
                  </span>
                  <span>
                    {new Date(order.created_at).toLocaleDateString("en-IN")}
                  </span>
                </div>

                <div className="shop-order-statuses">
                  <span className="shop-status-pill">
                    {orderStatuses[order.status] || order.status}
                  </span>
                  <span className="shop-payment-status">
                    Payment: {order.payment_status}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Shop;
