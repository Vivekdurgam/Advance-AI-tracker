from users.models import Employee

def find_best_assignee(department, tags_text=""):
    # Priority: Correct department, Available status, lowest load
    employees = Employee.objects.filter(department__icontains=department, availability_status='Available')
    if not employees.exists():
        employees = Employee.objects.filter(department__icontains=department) 
        
    if not employees.exists():
        employees = Employee.objects.filter(availability_status='Available')

    if not employees.exists():
        employees = Employee.objects.all()

    if not employees.exists():
        return None
        
    # Python-level sort to prioritize skill match, then lowest current load
    # Convert queryset to list
    emp_list = list(employees)
    
    tags_lower = tags_text.lower() if tags_text else ""
    
    def score_employee(emp):
        # We want lowest score to be the best
        # Load is base penalty (1 per ticket)
        score = emp.current_load * 10
        
        # Skill match gives a massive bonus (negative penalty)
        emp_skills = (emp.skill_tags or "").lower()
        if tags_lower and tags_lower in emp_skills:
            score -= 50
        elif emp_skills:
            # check intersection of skills
            for tag in emp_skills.split(','):
                if tag.strip() in tags_lower:
                    score -= 50
                    break
        
        return score
        
    emp_list.sort(key=score_employee)
    return emp_list[0]

