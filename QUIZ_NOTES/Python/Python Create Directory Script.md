# Python create a directory

## nQUESTION: 
> as a principal java dev, help me understand how this python code creates a directory if it doesnt exist 

```
 for language in spacy_models.keys():
    try:
        os.mkdir(f"data/{language}")
        print(f"Directory {language} created")
    except FileExistsError:
        print(f"Directory {language} already exists")
```

## ANSWER

Coming from a Java background, the most striking thing about this snippet is that it uses an **"Easier to Ask for Forgiveness than Permission" (EAFP)** approach, whereas Java developers are trained in **"Look Before You Leap" (LBYL)**.

Here is the breakdown from a Principal Java Dev perspective.

### 1. The Pattern: EAFP vs. LBYL
In Java, you would typically write:
```java
File dir = new File("data/" + language);
if (!dir.exists()) {
    dir.mkdirs();
}
```
This is **LBYL**. You check the state of the system before attempting the operation to avoid an exception.

The Python code provided does the opposite. It **assumes success** and handles the failure case via an exception. In the Python community, this is the idiomatic way to handle file I/O because it avoids a "race condition" (where the directory is created by another thread/process between your `exists()` check and your `mkdir()` call).

### 2. Line-by-Line Technical Translation

*   **`for language in spacy_models.keys():`**
    This is equivalent to iterating over a `Map<String, T>.keySet()`.
*   **`os.mkdir(f"data/{language}")`**
    *   `os.mkdir` is essentially `Files.createDirectory(Path path)`.
    *   The `f"..."` is an **f-string** (formatted string literal), which is exactly like `String.format("data/%s", language)` or the newer String Templates in Java 21.
*   **`except FileExistsError:`**
    This is a specific catch block for `java.nio.file.FileAlreadyExistsException`. Because `os.mkdir` throws this specific exception if the folder exists, the code uses the `except` block as a flow-control mechanism to say, "If it's already there, that's fine, just move on."

### 3. The "Gotcha" for Java Devs
As a Principal Dev, you'll spot a potential bug here immediately: **`os.mkdir` is not recursive.**

In Java, we often use `mkdirs()` (plural) to create all missing parent directories. `os.mkdir` will throw a `FileNotFoundError` (equivalent to a `NoSuchFileException`) if the parent directory `data/` does not already exist.

**The "Pro" Python way to do this:**
If this were a production system, a Python dev would likely use `os.makedirs` or the `pathlib` library to avoid the `try/except` block entirely:

```python
from pathlib import Path

# This is the equivalent of Files.createDirectories(path)
# exist_ok=True handles the "already exists" check internally
Path(f"data/{language}").mkdir(parents=True, exist_ok=True)
```

### Summary Comparison Table

| Feature | Java (NIO) | Python (this snippet) |
| :--- | :--- | :--- |
| **Strategy** | LBYL (Check then Act) | EAFP (Act then Handle) |
| **Operation** | `Files.createDirectory()` | `os.mkdir()` |
| **Failure** | `FileAlreadyExistsException` | `FileExistsError` |
| **String Handling** | `String.format()` | `f-string` |
| **Recursion** | `mkdirs()` | Needs `os.makedirs()` |

