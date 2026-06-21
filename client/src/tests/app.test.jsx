import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HashRouter } from 'react-router-dom'

// ── Mock the API module ───────────────────────────────────────────────────
vi.mock('../api', () => ({
  api: {
    getSettings:  vi.fn().mockResolvedValue({ ordering_open: true }),
    lookupOrders: vi.fn().mockResolvedValue([]),
    createOrder:  vi.fn().mockResolvedValue({
      id: 42, name: 'Alexander Bauer', email: 'alexander.bauer@sap.com',
      items: [{ product_id: 'classic-tee', product_name: 'Classic Tee', gender: 'mens', size: 'L', quantity: 1 }],
      notes: null,
    }),
    updateOrder: vi.fn().mockResolvedValue({
      id: 42, name: 'Alexander Bauer', email: 'alexander.bauer@sap.com', items: [], notes: null,
    }),
  },
}))

import App from '../App'
import { api } from '../api'
import OrderSummary from '../components/OrderSummary'
import ProductCard  from '../components/ProductCard'
import { PRODUCTS } from '../products'

function renderApp() {
  return render(<HashRouter><App /></HashRouter>)
}

// ── Email validation ──────────────────────────────────────────────────────
describe('Email validation', () => {
  beforeEach(() => vi.clearAllMocks())

  test('rejects email without @sap.com', async () => {
    renderApp()
    await userEvent.type(screen.getByPlaceholderText('your.name@sap.com'), 'test@gmail.com')
    fireEvent.submit(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() =>
      expect(screen.getByText(/must end with @sap.com/i)).toBeInTheDocument()
    )
  })

  test('rejects email with invalid format', async () => {
    renderApp()
    await userEvent.type(screen.getByPlaceholderText('your.name@sap.com'), '@sap.com')
    fireEvent.submit(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() =>
      expect(screen.getByText(/valid @sap.com/i)).toBeInTheDocument()
    )
  })

  test('accepts valid @sap.com email and proceeds to order page', async () => {
    renderApp()
    await userEvent.type(screen.getByPlaceholderText('your.name@sap.com'), 'alexander.bauer@sap.com')
    fireEvent.submit(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() =>
      expect(screen.getByText(/Hi, Alexander Bauer/i)).toBeInTheDocument()
    )
  })

  test('derives display name correctly from email', async () => {
    renderApp()
    await userEvent.type(screen.getByPlaceholderText('your.name@sap.com'), 'john.doe@sap.com')
    fireEvent.submit(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() =>
      expect(screen.getByText(/Hi, John Doe/i)).toBeInTheDocument()
    )
  })
})

// ── Returning user ────────────────────────────────────────────────────────
describe('Returning user', () => {
  beforeEach(() => vi.clearAllMocks())

  test('loads existing order when email is found', async () => {
    api.lookupOrders.mockResolvedValueOnce([{
      id: 5, name: 'Alexander Bauer', email: 'alexander.bauer@sap.com',
      items: [{ product_id: 'classic-tee', product_name: 'Classic Tee', gender: 'mens', size: 'XL', quantity: 2 }],
      notes: null, submitted_at: new Date().toISOString(),
    }])

    renderApp()
    await userEvent.type(screen.getByPlaceholderText('your.name@sap.com'), 'alexander.bauer@sap.com')
    fireEvent.submit(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() =>
      expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
    )
    expect(screen.getByText(/Editing your existing order #5/i)).toBeInTheDocument()
  })

  test('new user sees empty cart (no welcome back banner)', async () => {
    renderApp()
    await userEvent.type(screen.getByPlaceholderText('your.name@sap.com'), 'new.user@sap.com')
    fireEvent.submit(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() =>
      expect(screen.getByText(/Hi, New User/i)).toBeInTheDocument()
    )
    expect(screen.queryByText(/Welcome back/i)).not.toBeInTheDocument()
  })
})

// ── OrderSummary ──────────────────────────────────────────────────────────
describe('OrderSummary', () => {
  const items = [
    { product_id: 'classic-tee', product_name: 'Classic Tee', gender: 'mens', size: 'L', quantity: 2 },
    { product_id: 'neptune-polo', product_name: 'Neptune Polo', gender: 'womens', size: 'S', quantity: 1 },
  ]
  const noop = vi.fn()

  test('renders all items', () => {
    render(<OrderSummary items={items} name="Test" notes="" onNotesChange={noop}
      onRemoveItem={noop} onSubmit={noop} submitting={false} disabled={false} isEdit={false} />)
    expect(screen.getByText(/Classic Tee/)).toBeInTheDocument()
    expect(screen.getByText(/Neptune Polo/)).toBeInTheDocument()
  })

  test('shows correct estimated total', () => {
    render(<OrderSummary items={items} name="Test" notes="" onNotesChange={noop}
      onRemoveItem={noop} onSubmit={noop} submitting={false} disabled={false} isEdit={false} />)
    // 2 × $20.85 + 1 × $29.35 = $71.05
    expect(screen.getByText('$71.05')).toBeInTheDocument()
  })

  test('shows empty state when no items', () => {
    render(<OrderSummary items={[]} name="Test" notes="" onNotesChange={noop}
      onRemoveItem={noop} onSubmit={noop} submitting={false} disabled={false} isEdit={false} />)
    expect(screen.getByText(/No items added yet/i)).toBeInTheDocument()
  })

  test('calls onRemoveItem when × clicked', async () => {
    const onRemove = vi.fn()
    render(<OrderSummary items={items} name="Test" notes="" onNotesChange={noop}
      onRemoveItem={onRemove} onSubmit={noop} submitting={false} disabled={false} isEdit={false} />)
    await userEvent.click(screen.getAllByText('×')[0])
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  test('submit button disabled when no items', () => {
    render(<OrderSummary items={[]} name="Test" notes="" onNotesChange={noop}
      onRemoveItem={noop} onSubmit={noop} submitting={false} disabled={false} isEdit={false} />)
    expect(screen.getByRole('button', { name: /submit order/i })).toBeDisabled()
  })

  test('submit button shows "Update Order" in edit mode', () => {
    render(<OrderSummary items={items} name="Test" notes="" onNotesChange={noop}
      onRemoveItem={noop} onSubmit={noop} submitting={false} disabled={false} isEdit={true} />)
    expect(screen.getByRole('button', { name: /update order/i })).toBeInTheDocument()
  })
})

// ── ProductCard ───────────────────────────────────────────────────────────
describe('ProductCard', () => {
  const product = PRODUCTS[0]
  const noop = vi.fn()

  test('renders product name and price', () => {
    render(<ProductCard product={product} orderItems={[]} onAddItem={noop} onRemoveItem={noop} disabled={false} />)
    expect(screen.getByText('Classic Tee')).toBeInTheDocument()
    expect(screen.getByText(/\$20\.85/)).toBeInTheDocument()
  })

  test('shows mens sizes by default', () => {
    render(<ProductCard product={product} orderItems={[]} onAddItem={noop} onRemoveItem={noop} disabled={false} />)
    expect(screen.getByRole('button', { name: 'XL' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5XL' })).toBeInTheDocument()
  })

  test('shows womens sizes when Women\'s tab clicked', async () => {
    render(<ProductCard product={product} orderItems={[]} onAddItem={noop} onRemoveItem={noop} disabled={false} />)
    await userEvent.click(screen.getByRole('button', { name: "Women's" }))
    expect(screen.getByRole('button', { name: 'XS' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '5XL' })).not.toBeInTheDocument()
  })

  test('calls onAddItem with correct data when size selected and Add clicked', async () => {
    const onAdd = vi.fn()
    render(<ProductCard product={product} orderItems={[]} onAddItem={onAdd} onRemoveItem={noop} disabled={false} />)
    await userEvent.click(screen.getByRole('button', { name: 'L' }))
    await userEvent.click(screen.getByRole('button', { name: /Add.*L/i }))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      product_id: 'classic-tee', gender: 'mens', size: 'L', quantity: 1,
    }))
  })

  test('Add button disabled when ordering is disabled', () => {
    render(<ProductCard product={product} orderItems={[]} onAddItem={noop} onRemoveItem={noop} disabled={true} />)
    expect(screen.getByRole('button', { name: /select a size/i })).toBeDisabled()
  })
})
