# UI INSPECTION GUIDE - Lấy Selectors Chính Xác

## 🎯 Mục tiêu
Inspect UI thực tế để lấy `data-testid`, class names, và locators chính xác thay vì đoán.

## 📋 Các trang cần inspect

### 1. Login Page (`/login`)
**Cần lấy:**
- [ ] Email input selector
- [ ] Password input selector  
- [ ] Login button selector
- [ ] Error message selector

**Recommended selectors (theo Playwright docs):**
```typescript
// ✅ BEST - Role-based (user-facing)
page.getByRole('textbox', { name: 'Email' })
page.getByRole('textbox', { name: 'Password' })
page.getByRole('button', { name: 'Sign In' })

// ✅ GOOD - Label-based
page.getByLabel('Email')
page.getByLabel('Password')

// ⚠️ OK - Placeholder (nếu không có label)
page.getByPlaceholder('email@example.com')

// ✅ BEST - Test ID (add to code)
page.getByTestId('login-email')
page.getByTestId('login-password')
page.getByTestId('login-submit')
```

### 2. Dashboard (`/dashboard` or `/ceo/dashboard`)
**Cần lấy:**
- [ ] Main heading/title selector
- [ ] Navigation menu items
- [ ] Stats cards/widgets
- [ ] Company name display

**Recommended selectors:**
```typescript
// ✅ Role-based navigation
page.getByRole('navigation')
page.getByRole('link', { name: 'Nhân viên' })
page.getByRole('link', { name: 'Công việc' })

// ✅ Heading
page.getByRole('heading', { name: /Dashboard|Bảng điều khiển/i })

// ✅ Stats (add data-testid)
page.getByTestId('stat-employees-count')
page.getByTestId('stat-tasks-pending')
```

### 3. Employees Page (`/employees`)
**Cần lấy:**
- [ ] Employee list/table selector
- [ ] Search input selector
- [ ] Add employee button
- [ ] Employee row selectors

**Recommended selectors:**
```typescript
// ✅ Table-based
page.getByRole('table')
page.getByRole('row')
page.getByRole('cell')

// ✅ Search
page.getByPlaceholder('Tìm kiếm nhân viên...')
page.getByRole('searchbox')

// ✅ Add button
page.getByRole('button', { name: /Thêm|Add|Tạo mới/ })

// ✅ Filter by text
page.getByRole('row').filter({ hasText: 'Test Manager' })
```

### 4. Tasks Page (`/tasks`)
**Cần lấy:**
- [ ] Task list selector
- [ ] Create task button
- [ ] Status filter dropdown
- [ ] Task title input (create form)

**Recommended selectors:**
```typescript
// ✅ List items
page.getByRole('list')
page.getByRole('listitem')

// ✅ Create button
page.getByRole('button', { name: /Tạo|Create|New/ })

// ✅ Form inputs
page.getByLabel('Title')
page.getByLabel('Description')
page.getByRole('combobox', { name: 'Status' })

// ✅ Filter
page.locator('select[name="status"]')
page.selectOption({ label: 'Completed' })
```

### 5. Attendance Page (`/attendance`)
**Cần lấy:**
- [ ] Attendance table selector
- [ ] Date filter inputs
- [ ] Check-in/Check-out times

**Recommended selectors:**
```typescript
// ✅ Table
page.getByRole('table')
page.getByRole('columnheader', { name: 'Check In' })

// ✅ Date filters
page.getByLabel('From Date')
page.getByLabel('To Date')

// ✅ Specific cells
page.getByRole('cell', { name: /8:30|9:15/ })
```

## 🔧 Action Plan

### Step 1: Add data-testid to components
Thêm `data-testid` vào components quan trọng:

```tsx
// ✅ Example: Login form
<input
  type="email"
  data-testid="login-email"
  placeholder="email@example.com"
/>

<button
  type="submit"
  data-testid="login-submit"
>
  Đăng nhập
</button>

// ✅ Example: Dashboard stats
<div data-testid="stat-card-employees">
  <h3>Total Employees</h3>
  <p>{employeeCount}</p>
</div>

// ✅ Example: Navigation
<nav data-testid="main-navigation">
  <a href="/employees" data-testid="nav-employees">Nhân viên</a>
  <a href="/tasks" data-testid="nav-tasks">Công việc</a>
</nav>
```

### Step 2: Use Playwright Codegen
Run codegen để inspect và generate selectors:

```bash
npx playwright codegen http://localhost:9000
```

**Workflow:**
1. Login với CEO account
2. Navigate to each page
3. Click on elements
4. Copy generated selectors
5. Refine selectors theo best practices

### Step 3: Use Playwright Inspector
Run tests với inspector:

```bash
npx playwright test --headed --debug
```

**Workflow:**
1. Test sẽ pause at breakpoints
2. Hover elements in browser
3. Inspector shows best selector
4. Pick selector button to test locators

## 📝 Selector Priority (Theo Playwright Docs)

**Priority Order:**
1. ✅ `getByRole()` - Closest to how users interact
2. ✅ `getByLabel()` - For form controls
3. ✅ `getByPlaceholder()` - If no label
4. ✅ `getByText()` - For non-interactive elements
5. ✅ `getByTestId()` - For complex scenarios
6. ⚠️ `locator('css')` - Last resort, brittle

**Anti-patterns (AVOID):**
```typescript
// ❌ BAD - Brittle CSS chains
page.locator('#tsf > div:nth-child(2) > div.A8SBwf')

// ❌ BAD - Generic selectors
page.locator('button').nth(3)

// ❌ BAD - Hardcoded Vietnamese only
page.locator('text=Đăng nhập') // Won't work if UI switches to English
```

**Best practices:**
```typescript
// ✅ GOOD - Flexible text matching
page.getByRole('button', { name: /Sign In|Đăng nhập/i })

// ✅ GOOD - Multiple fallbacks
const loginButton = page.getByTestId('login-submit')
  .or(page.getByRole('button', { name: /Sign In/i }))
  
// ✅ GOOD - Filter by child element
page.getByRole('row').filter({
  has: page.getByRole('cell', { name: 'Test Manager' })
})
```

## 🎬 Next Steps

1. [ ] Run `npm run dev` để start app
2. [ ] Open http://localhost:9000 in browser
3. [ ] Login với CEO: longsangsabo1@gmail.com / Acookingoil123@
4. [ ] Open DevTools (F12)
5. [ ] Inspect mỗi page và note selectors
6. [ ] Add `data-testid` vào code components
7. [ ] Update tests với selectors chính xác
8. [ ] Run `npx playwright codegen http://localhost:9000` để verify

## 📚 References

- [Playwright Locators Guide](https://playwright.dev/docs/locators)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Codegen](https://playwright.dev/docs/codegen)
- [Test Fixtures](https://playwright.dev/docs/test-fixtures)
