# Contributing to JobPulse AI

Thank you for your interest in improving JobPulse AI! We welcome contributions from developers, designers, security researchers, and students.

---

## 1. Code of Conduct
We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, constructive, and collaborative in all discussions and code reviews.

---

## 2. Getting Started

1. **Fork the Repository**:
   Click the **Fork** button at [https://github.com/Pratikshaprabhakarbande/JobPulseAI](https://github.com/Pratikshaprabhakarbande/JobPulseAI).

2. **Clone your fork**:
   ```powershell
   git clone https://github.com/<your-username>/JobPulseAI.git
   cd JobPulseAI
   ```

3. **Install Dependencies**:
   ```powershell
   # In client
   cd client
   npm install

   # In server
   cd ../server
   npm install
   ```

4. **Create a Feature Branch**:
   ```powershell
   git checkout -b feature/your-feature-name
   ```

---

## 3. Development Guidelines

- **Zero Fake Data Policy**: Never introduce mock data presented as live vacancies or manufacture fake verification outcomes.
- **SSRF Safety**: Any new external HTTP interaction must pass through `isSafeUrl()` in `server/src/services/verificationService.ts`.
- **Type Safety**: Maintain strict TypeScript typing across both `client` and `server`. Avoid `any` where a concrete interface can be used.
- **Privacy & Secrets**: Never commit `.env` files, actual API keys, SMTP credentials, or real user resumes to git.

---

## 4. Running Quality Checks

Before submitting a Pull Request, verify that all builds and tests pass cleanly:

```powershell
# 1. Run Backend Automated Test Suite
cd server
npm test

# 2. Run Frontend Production Build & TypeScript Check
cd ../client
npm run build
```

Both commands must exit with code 0.

---

## 5. Submitting a Pull Request

1. Commit your changes with clear, descriptive commit messages:
   ```powershell
   git commit -m "feat(matching): add support for aerospace engineering skills"
   ```
2. Push to your fork:
   ```powershell
   git push origin feature/your-feature-name
   ```
3. Open a Pull Request against the `main` branch on [JobPulseAI](https://github.com/Pratikshaprabhakarbande/JobPulseAI).
4. Provide a detailed description of the changes, test results, and any relevant issue references.

---

## 6. Security Vulnerability Disclosure

If you discover a security vulnerability (such as an SSRF bypass, path traversal issue, or secret leakage), **please do not open a public GitHub issue**.

Instead, please notify the project maintainer directly via GitHub at [https://github.com/Pratikshaprabhakarbande](https://github.com/Pratikshaprabhakarbande).
