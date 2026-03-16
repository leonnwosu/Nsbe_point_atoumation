import pandas as pd
import numpy as np
import re


pointdist = {
    'GBM' : 5,
    'Community Service': 8,
    'Fundraising': 6,
    'Chapter Events': 7,
}

def normalize_name(name):
    return re.sub(r'[\s\W_]+', '', str(name).lower())

def read_data(attendance_file, points_file):
    """Reads the CSV file and returns a DataFrame."""
    attendance_df = pd.read_csv(attendance_file, sep=',', header=0)
    points_df = pd.read_csv(points_file, sep=',', header=0)
    return attendance_df, points_df

def calculatepoints(attendance_df, points_df, activity_type):
    """Calculates points for each member based on attendance."""
    points_per_event = pointdist.get(activity_type, 0)
    
    
    attendance_df['FullName'] = attendance_df['FullName'].str.strip().replace('\t', ' ', regex=True)
    points_df['FullName'] = points_df['FullName'].str.strip().replace('\t', ' ', regex=True)

    points_df['Points'] = pd.to_numeric(points_df['Points'], errors='coerce').fillna(0)

    attendees = set(attendance_df['FullName'].apply(normalize_name))

    def update_points(row):
        name = normalize_name(row['FullName'])
        if name in attendees:
            return row['Points'] + points_per_event
        return row['Points']
    
    points_df['Points'] = points_df.apply(update_points, axis=1)
    
    return points_df

if __name__ == "__main__":
    attendance_file = 'Attendance/skatenight.txt' # replace with file upload UI artifact
    points_file = 'point_tracker.txt' # replace with file upload ui component
    
    attendance_df, points_df = read_data(attendance_file, points_file)

    print(points_df.head())
    print(attendance_df.head())

    updated_points_df = calculatepoints(attendance_df, points_df, 'Chapter Events')
    print(updated_points_df)

    updated_points_df.to_csv('point_tracker.txt', index=False) # add download function to download funciton locally
    
    
   