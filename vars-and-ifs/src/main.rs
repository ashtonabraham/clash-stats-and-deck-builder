use std::io;
fn main() 
{
    let mut x: i32;  
    
    println!("Do you want to know if a number is even or odd?");

    let mut input = String::new();
    io::stdin()
        .read_line(&mut input)
        .expect("Failed to read line");
        x = input.trim().parse().expect("Please enter a valid integer");

    if x % 2 == 0
    {
        println!("The number is even");
    } else {
        println!("The number is odd");
    }


}
