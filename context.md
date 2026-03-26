# Rust learning context

This folder is for learning Rust with a C++ background. The goal is to translate familiar C++ ideas (variables, user input, math, loops, etc.) into Rust and build small programs.

## What this project is doing

- **`main.rs`** – Entry point. Right now it:
  - Reads a number from the user (like `std::cin >> x` in C++).
  - Uses `% 2` to check if the number is odd or even.
  - Prints the result.

## Concepts used (C++ → Rust)

| Idea | C++ | Rust |
|------|-----|------|
| User input | `std::cin >> x` | `io::stdin().read_line(&mut input)` then `input.trim().parse()` |
| Mutable variable | default | `let mut x` |
| Modulo | `x % 2` | `x % 2` (same) |
| Conditionals | `if (x % 2 == 0)` | `if x % 2 == 0` (no parens) |

## Reference: basics

- **Variables** – `let x = 5;` (immutable). Use `let mut x` to allow changes.
- **Types** – e.g. `i32`, `f64`, `String`. Often inferred; add `: Type` when needed.
- **Printing** – `println!("{}", x);` or `println!("{x}");`
- **Reading a line** – `String::new()` then `io::stdin().read_line(&mut input)`. Parse with `.trim().parse::<i32>()` or `.trim().parse().expect("message")`.

## Running

From the `rust` directory:

```bash
cargo run
```

## Next steps (ideas)

- Add a loop to keep asking for numbers until the user quits.
- Try other math (e.g. sum, average) or simple conditionals.
- Use a `Vec<i32>` for a list of numbers (like `std::vector<int>`).
