import pandas as pd

def fixtable(file_path):
    """Reads a tab-separated file and saves it as a comma-separated CSV file."""
    df = pd.read_csv(file_path, sep='\t', header=0)

    # concatenate first and last name into FullName column
    df['FullName'] = df['FirstName'] + ' ' + df['LastName']
    df = df[['FullName']]  # keep only the FullName column
    df.to_csv(file_path, index=False)

if __name__ == "__main__":
    file_path = 'GM1'  # specify your file path here
    fixtable(file_path)



