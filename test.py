def get_mol():
    return 2

if __name__ == "__main__":  
    task = [get_mol() for _ in range(10)]
    for item in task:
        print(item)
    