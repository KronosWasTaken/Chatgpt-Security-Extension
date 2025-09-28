from sqlalchemy import select, func, case, join



#helpers for orm tasks
def count_distinct_or_zero(column):
    return func.coalesce(func.count(func.distinct(column)), 0)

def sum_or_zero(column):
    return func.coalesce(func.sum(column), 0)

def avg_or_zero(column):
    return func.coalesce(func.avg(column), 0)

def count_distinct_conditional_or_zero(condition_column, condition_value, target_column):
    return func.coalesce(
        func.count(func.distinct(
            case((condition_column == condition_value, target_column), else_=None)
        )), 0
    )