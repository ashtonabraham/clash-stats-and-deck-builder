use std::io;
use rand::RngExt;
use std::cmp::Ordering;

fn main() {
    println!("=== Guessing Game ===");
    println!("I'm thinking of a number between 1 and 100.");

    // Generate a random number between 1 and 100 (inclusive)
    let secret = rand::rng().random_range(1..=100);

    let mut guesses = 0;

    loop {
        guesses += 1;

        // ordinal suffix: 1st, 2nd, 3rd, 4th, 5th...
        let suffix = match guesses % 10 {
            1 if guesses % 100 != 11 => "st",
            2 if guesses % 100 != 12 => "nd",
            3 if guesses % 100 != 13 => "rd",
            _ => "th",
        };
        println!("\nEnter your {guesses}{suffix} guess:");

        let mut input = String::new();
        io::stdin()
            .read_line(&mut input)
            .expect("Failed to read line");

        // Parse the input — if it's not a number, skip this iteration
        // In C++ you'd check cin.fail(). In Rust, parse() returns a Result.
        // `match` is like a switch statement, but way more powerful.
        let guess: i32 = match input.trim().parse() {
            Ok(num) => num,   // valid number — use it
            Err(_) => {
                println!("That's not a valid number! Try again.");
                continue;     // skip to next loop iteration
            }
        };

        // Compare the guess to the secret using match + Ordering
        // Ordering is an enum with three variants — like a three-way comparison
        match guess.cmp(&secret) {
            Ordering::Less => println!("Too low!"),
            Ordering::Greater => println!("Too high!"),
            Ordering::Equal => {
                println!("You got it in {guesses} guesses!");
                break; // exit the loop
            }
        }
    }
}
