# Rust Learning Project

## About
Ashton is learning Rust with a C++ background. The goal is to translate familiar C++ concepts into Rust through small programs.

## Project Structure
- `src/main.rs` — Main crate entry point (cargo run from root)
- `vars-and-ifs/` — Separate crate for variables, user input, and conditionals (cd into it and cargo run)
- `context.md` — Reference notes mapping C++ concepts to Rust equivalents

## How to Run
```bash
# Run the main crate
cargo run

# Run a sub-project
cd vars-and-ifs && cargo run
```

## Conventions
- Edition 2024
- Keep programs small and focused on one concept at a time
- Each new topic can be its own crate (subdirectory with its own Cargo.toml)
- Use comments to explain new Rust concepts, especially where they differ from C++

## Teaching Style
- Explain Rust concepts by comparing to C++ equivalents when helpful
- Introduce one or two new ideas per program, don't overwhelm
- Encourage running and experimenting with the code
- Point out common gotchas for C++ programmers (ownership, borrowing, no null, etc.)
